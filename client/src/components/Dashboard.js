// Dashboard.js

import React, { useEffect, useState } from 'react';

import './dashboard.styles.scss';
import Button from './button/button.component';
import { redirect } from 'react-router-dom';


const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Retrieve user details from localStorage
    const storedUser = localStorage.getItem('user');

    // Check if user details are available
    if (storedUser) {
      // Parse the JSON string to get the user object
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, []);

  const handleLogOut = async () => {
       window.location.replace('sign-in');
  };

  return (
    <div className="dashboard">
      {user ? (
        <div  >
           <h2 style={{color:"green"}}>Dashboard</h2>
           <marquee><p><b>Welcome, {user.username}!</b></p></marquee>
          {/* Display other user details as needed */}
        </div>
      ) : (
        <p>User details not found. Please log in.</p>
      )}
         <div className="buttons-container">
            <br></br>
        <Button type="submit" onClick={handleLogOut}>Log Out</Button>
         </div>
    </div>
  );
};

export default Dashboard;
