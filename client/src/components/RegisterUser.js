import React, { useState, useRef, useEffect   } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';
import FormInput from './form-input/form-input.component';
import './sign-up-form.styles.scss';
import Button from './button/button.component';
import { Outlet, Link } from "react-router-dom";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import QRCode from 'qrcode.react'; // Import the QR code library
import Modal from 'react-modal';
import  './modalstyles.css';
import myImage from '../assets/SleekCodes.jpg';

const REGISTER_USER = gql`
  mutation Register($username: String!, $email: String!, $password: String!, $confirmPassword: String!) {
    register(username: $username, email: $email, password: $password, confirmPassword: $confirmPassword) {
      token
      user {
        id
        username
        email
        totpSecret
      }
    }
  }
`;

const RegisterUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [register] = useMutation(REGISTER_USER);
  const [open, setOpen] = React.useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeValue, setQRCodeValue] = useState('');
  const [modalOpen, setmodalOpen] = useState(false);
  const [isQRCodeScannerVisible, setIsQRCodeScannerVisible] = useState(false);
  const[getSecretKey, setSecretKey] = useState('');

  const toggleModal = () =>{
    setmodalOpen(!modalOpen);

  }

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
       // Clear form fields
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // If the user has a TOTP secret, show the QR code
      if (user && user.totpSecret){
        setQRCodeValue(`otpauth://totp/Middle-Man:${username}?secret=${user.totpSecret}&issuer=Middle-Man`);
        setShowQRCode(true);
        setIsQRCodeScannerVisible(true); // Display the QR code scanner
        toggleModal();
        setSecretKey(user.totpSecret)
      }

      localStorage.setItem('token', token);
      alert("user registered successfully! Set up 2FA by scanning the QR code that will be displayed to you");
      console.log('User registered successfully!', user);
    } catch (error) {
      alert(error.message);
      setError(error.message);
      handleClose();
      console.error('Registration failed', error.message);
    }
  };

  const handleCopyToClipboard = () => {
  const textField = document.createElement('textarea');
  textField.innerText = getSecretKey;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand('copy');
  document.body.removeChild(textField);


  // Optionally, provide feedback to the user (e.g., a toast message)
  alert('QR code key copied to clipboard!');
};

  return (
    <div>

      <img src={myImage} className='sleekcode_Logo' alt='sleekcode logo' />

    <div className="sign-up-container">
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
       <div className="buttons-container">
            <Button type="submit" onClick={handleRegister}>Sign Up</Button>
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
              open={open}
              onClick={handleClose}
            >
              <CircularProgress color="inherit" />
            </Backdrop>
        </div>
        <Modal
            isOpen={modalOpen}
            onRequestClose={toggleModal}
            contentLabel="My dialog"
            className="mymodal"
            overlayClassName="myoverlay"
            closeTimeoutMS={500}
         >
          
        <div class="qrblock">

        {showQRCode && isQRCodeScannerVisible && (
          <div >
              <p>Scan the QR code using your authenticator app:</p>
              <div className="show-code">
              <QRCode value={qrCodeValue} className="qr" onClick={handleCopyToClipboard} /> 
              </div>
          </div>
        )}
        </div>
        <br></br>
        <br></br>
        <Button type="submit" onClick={toggleModal} className='close-modal'>Close modal</Button>
      
      </Modal>
        <h4>Already have an account ? <Link to="/sign-In" style={{ textDecoration: "none" }}>Sign In</Link> </h4>
        <Outlet />
      </div>
    </div>
    </div>
  );
};

export default RegisterUser;

