// AuthForms.js
import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';
import FormInput from './form-input/form-input.component';
import './sign-up-form.styles.scss'
import Button from './button/button.component';
import { Outlet, Link } from "react-router-dom";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

const REGISTER_USER = gql`
  mutation Register($username: String!, $email: String!, $password: String!, $confirmPassword: String!) {
    register(username: $username, email: $email, password: $password, confirmPassword: $confirmPassword) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

const AuthForms = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [register] = useMutation(REGISTER_USER);
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleRegister = async () => {

    handleOpen();
    try {
      setError(null);
      const response = await register({
        variables: { username, email, password, confirmPassword },
      });

      handleClose();
       
      const { token, user } = response.data.register;
      localStorage.setItem('token', token);
      alert("user Registered successfully ! Sign in using the link Below");
      console.log('User registered successfully!', user);
    } catch (error) {
      alert(error.message);
      setError(error.message);
      handleClose();
      console.error('Registration failed', error.message);
    }
  };



  return (
    <div className="sign-up-container">
        <h1 style={{color:"green"}}>Authenticator App</h1>
        <h2>Don't have an account?</h2>
        <span>sign up with your email and password</span>
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <FormInput
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <FormInput
        type="text"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormInput
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormInput
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit" onClick={handleRegister}>Sign Up</Button>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <h4>Already have an account ?  <Link to="/sign-In" style={{textDecoration:"none"}}>Sign In</Link> </h4> 
      <Outlet /> 
  </div>
    </div>
  );
};

export default AuthForms;
