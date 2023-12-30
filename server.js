require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const path = require('path'); 
const jwt = require('jsonwebtoken');
const cors = require('cors'); 
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3001;
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

app.use(express.static(path.resolve(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client/build', 'index.html'));
});


// Define a route handler for serving the favicon.ico
app.get('/favicon.ico', (req, res) => {
  // Send the favicon.ico file from the client/public folder
  res.sendFile(path.join(__dirname, 'client', 'public', 'favicon.ico'));
});


app.use(express.static('public'));




// Enable CORS for all routes
app.use(cors());

// Middleware for parsing JSON requests
app.use(express.json());

// Your other middleware and routes
// For example, error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// MongoDB connection
const uri = process.env.MONGODB;
const JWT_SECRET =  process.env.JWT_SECRET;

//Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});


// MongoDB connection
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  loginAttempts: {
    type: Number,
    default: 0,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  lockoutExpires: Date,
  totpSecret: String,
});

const UserModel = mongoose.model('User', userSchema);

const schema = buildSchema(`
  type User {
    id: ID!
    username: String!
    email: String!
    password: String!
    loginAttempts: Int
    locked: Boolean
    lockoutExpires: String
    totpSecret: String
  }

  type Query {
    user(id: ID!): User
    getUserInfo(username: String!): User 
  }

  type Mutation {
    register(username: String!, email: String!, password: String!, confirmPassword: String!): AuthPayload
    login(username: String!, password: String!, code: String): AuthPayload
    enableTwoFactorAuth: EnableTwoFactorAuthResponse
    verifyTwoFactorAuth(code: String!): VerifyTwoFactorAuthResponse
  }

  type AuthPayload {
    token: String
    user: User
  }

  type EnableTwoFactorAuthResponse {
    qrCode: String
  }

  type VerifyTwoFactorAuthResponse {
    token: String
    user: User
  }

`);

const root = {
  user: async ({ id }) => {
    try {
      const user = await UserModel.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error('Error fetching user');
    }
  },
  register: async ({ username, email, password, confirmPassword }) => {
    try {
      if (!username || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        throw new Error('Username or email is already taken');
      }

       const saltRounds = 10;
       const hashedPassword = await bcrypt.hash(password, saltRounds);

       const user = new UserModel({ username, email, password: hashedPassword });

        // Generate TOTP secret and store it
      const totpSecret = speakeasy.generateSecret({ length: 20, name: 'Middle-Man' });

        // Generate TOTP URL for QR code
        const totpUri = speakeasy.otpauthURL({
          secret: totpSecret.ascii,
          label: 'Middle-Man:' + username,
          issuer: 'Middle-Man',
        });

         // Generate QR code for TOTP
      const qrCode = await qrcode.toDataURL(totpUri);


      user.totpSecret = totpSecret.base32;
      await user.save();

      const token = jwt.sign({ username, email }, JWT_SECRET, { expiresIn: '4h' });

      return { token, user, qrCode };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  },
  login: async ({ username, password, code }) => {
    try {
      // Find the user by username
      const user = await UserModel.findOne({ username });
  
      // Check if the user exists
      if (!user) {
        throw new Error('Invalid username');
      }
  
      // Check if the user is locked out
      if (user.locked && user.lockoutExpires && new Date(user.lockoutExpires) > new Date()) {
        throw new Error(`Account locked. Please try again after ${user.lockoutExpires}`);
      }
  
      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, user.password);

      // If passwords do not match, handle login attempts and lockout logic
      if (!passwordMatch) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.locked = true;
          user.lockoutExpires = new Date(Date.now() + (60 * 60 * 1000)).toISOString(); // Lockout for 1 hour
          await user.save();
          throw new Error(`Account locked due to multiple failed login attempts. Please try again after ${user.lockoutExpires}`);
        }
  
        await user.save();
  
        throw new Error('Invalid password');
      }


      if (user.totpSecret) {
        const verification = speakeasy.totp.verify({
          secret: user.totpSecret,
          encoding: 'base32',
          token: code,
        });

        if (!verification) {
          throw new Error('Invalid TOTP code');
        }
      }


  
      // Reset loginAttempts on successful login
      user.loginAttempts = 0;
      user.locked = false;
      user.lockoutExpires = null;
      await user.save();
  
      // Create and return a JWT token on successful login
      const token = jwt.sign({ username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        // Send email notification
        const emailOptions = {
          from: process.env.EMAIL_USERNAME,
          to: user.email,
          subject: 'Successful Login Notification',
          text: `Dear ${user.username},\n\nYou have successfully logged in at ${new Date()}.`,
        };
  
        await transporter.sendMail(emailOptions);
  
      return { token, user, code };
    } catch (error) {
      console.error('Login failed:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }
  },

  enableTwoFactorAuth: async ({}, context) => {
    const user = context.user; // Assuming you have a middleware to authenticate the user
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (user.totpSecret) {
      throw new Error('Two-factor authentication is already enabled');
    }

    const totpSecret = speakeasy.generateSecret({ length: 20, name: 'Middle-Man' });
    const totpUri = speakeasy.otpauthURL({
      secret: totpSecret.ascii,
      label: `Middle-Man:${user.username}`,
      issuer: 'Middle-Man',
    });

    const qrCode = await qrcode.toDataURL(totpUri);

    user.totpSecret = totpSecret.base32;
    await user.save();

    return { qrCode };
  },



  verifyTwoFactorAuth: async ({ code }, context) => {
    const user = context.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!user.totpSecret) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const verification = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
    });

    if (!verification) {
      throw new Error('Invalid TOTP code');
    }

    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    return { token, user };
  },
  
};

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
    context: (req) => ({ user: req.user }),
  })
);

app.listen(PORT,'0.0.0.0',() => {
  console.log(`Server is running on http://localhost:${PORT}/graphql`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason, promise);
});