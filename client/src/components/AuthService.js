// authService.js
const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token; // Return true if token is present, false otherwise
  };
  
  export default isAuthenticated;