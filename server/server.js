require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const path = require('path'); 
const jwt = require('jsonwebtoken');
const cors = require('cors'); 
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3001;


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
  }

  type Query {
    user(id: ID!): User
  }

  type Mutation {
    register(username: String!, email: String!, password: String!, confirmPassword: String!): AuthPayload
    login(username: String!, password: String!): AuthPayload
  }

  type AuthPayload {
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
      await user.save();

      const token = jwt.sign({ username, email }, JWT_SECRET, { expiresIn: '1h' });

      return { token, user };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  },
  login: async ({ username, password }) => {
    try {
      const user = await UserModel.findOne({ username });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (user.locked && user.lockoutExpires && new Date(user.lockoutExpires) > new Date()) {
        throw new Error(`Account locked. Please try again after ${user.lockoutExpires}`);
      }

    // Compare the provided password with the hashed password in the database
     const passwordMatch = await bcrypt.compare(password, user.password);

     if (!passwordMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.locked = true;
        user.lockoutExpires = new Date(Date.now() + (60 * 60 * 1000)).toISOString(); // Lockout for 1 hour
        await user.save();
        throw new Error(`Account locked due to multiple failed login attempts. Please try again after ${user.lockoutExpires}`);
      }

      await user.save();

      throw new Error('password not a match !');
    }

      // Reset loginAttempts on successful login
      user.loginAttempts = 0;
      user.locked = false;
      user.lockoutExpires = null;
      await user.save();

      const token = jwt.sign({ username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

      return { token, user };

    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  },
};

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
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