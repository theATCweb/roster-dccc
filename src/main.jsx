import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Capacitor init
if (window.Capacitor) {
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) CapApp.exitApp();
    });
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
