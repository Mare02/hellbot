import React from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import App from './App.jsx';
import { AppThemeProvider } from './AppTheme.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </React.StrictMode>
);
