import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom'

const client = new ApolloClient({
 uri: 'https://middle-man-authenticator-a3e8e4fa764e.herokuapp.com/graphql', 
  //uri: 'http://localhost:3001/graphql',// Replace with your server URL
  cache: new InMemoryCache(),
});

const root = createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter>
  <ApolloProvider client={client}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ApolloProvider>
  </BrowserRouter>
);

reportWebVitals();
