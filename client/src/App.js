import React from 'react';
import RegisterUser from './components/RegisterUser';
import ReactDOM from "react-dom/client";
import {Routes, Route } from "react-router-dom";
import SignInForm from './components/sign-in';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="App">
      <Routes>
          <Route path="/" element={<RegisterUser />} />
          <Route path="sign-In" element={<SignInForm />} />
          <Route path="sign-up" element={<RegisterUser />} />
          {/* <Route path="/dashboard" component={Dashboard}  /> */}
          <Route path="dashboard" element={<Dashboard />} />

       </Routes>
    </div>

  );
}

export default App;
