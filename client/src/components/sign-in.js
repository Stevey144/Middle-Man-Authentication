// AuthForms.js
import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';
import { Outlet, Link, useNavigate, useNavigation, redirect } from "react-router-dom";
import FormInput from './form-input/form-input.component';
import Button from './button/button.component';
import './sign-in-form.styles.scss';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

const LOGIN_USER = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

const SignInForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [login] = useMutation(LOGIN_USER);
  const [open, setOpen] = React.useState(false);


  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
    

  const handleLogin = async (e) => {
     e.preventDefault();

    // handleOpen();
    //   const response = await login({
    //     variables: { username, password },
    //   });

    //   handleClose();
    //   const { token, user } = response.data.login;
    //   localStorage.setItem('token', token);
    //   localStorage.setItem('user', JSON.stringify(user)); // Store user details as JSON string
    //   alert("login Successful");
    //   window.location.replace('/dashboard');
    //   console.log('User logged in successfully!', user);

      handleOpen();
      try {
        setError(null);
        const response = await login({
          variables: { username, password },
        });
  
        handleClose();
        const { token, user } = response.data.login;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user)); // Store user details as JSON string
        alert("login Successful");
        window.location.replace('/dashboard');
        console.log('User logged in successfully!', user);
      } catch (error) {
        setError(error.message);
        console.error('Login failed', error.message);
        alert(error.message);
      }
  };

  return (
    <div className="sign-in-container">
       <h2>Already have an account?</h2>
       <span>sign in with your username and password</span>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    <form>
      <FormInput
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <FormInput
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
        <div className="buttons-container">
      <Button type="submit" onClick={handleLogin}>Login</Button>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
         </div>
      <h4>do not have an account ? <Link to="/sign-up" style={{textDecoration:"none"}}>Sign up</Link> </h4> 
        </form>
    </div>

  );
};

export default SignInForm;
