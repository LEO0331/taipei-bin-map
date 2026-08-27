import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(() => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (window.sessionStorage.getItem('sw-reloaded')) return;
        window.sessionStorage.setItem('sw-reloaded', '1');
        window.location.reload();
      });
    }).catch(() => {
      // PWA support should not block normal map usage.
    });
  });
}
