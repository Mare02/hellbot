import React from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App.jsx';

const theme = createTheme({
  primaryColor: 'copper',
  primaryShade: 7,
  defaultRadius: 'md',
  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '650',
  },
  colors: {
    dark: [
      '#EDF0F4',
      '#D1D7E0',
      '#A5AEBB',
      '#7D8797',
      '#4B5461',
      '#303641',
      '#252B34',
      '#1C2027',
      '#14171C',
      '#101318',
    ],
    copper: [
      '#FFF3EC',
      '#FBE5D9',
      '#F3C9B1',
      '#EBAE8A',
      '#E19A72',
      '#D98B68',
      '#CE7A55',
      '#AD613F',
      '#8D4D32',
      '#733F2B',
    ],
  },
  components: {
    Button: { defaultProps: { fw: 600 } },
    Paper: { defaultProps: { radius: 'md' } },
    Input: { defaultProps: { size: 'sm' } },
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
