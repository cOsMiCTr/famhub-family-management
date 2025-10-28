import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'

// Global cleanup of corrupted localStorage data - runs before anything else
(function() {
  try {
    const user = localStorage.getItem('user');
    if (user === 'undefined' || user === 'null' || (user && user.trim() === 'undefined')) {
      console.log('🧹 Cleaning corrupted localStorage data');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('temp_token');
      localStorage.removeItem('i18nextLng');
      sessionStorage.clear();
    }
  } catch (error) {
    console.error('Error during localStorage cleanup:', error);
    // Clear everything if there's an error
    localStorage.clear();
    sessionStorage.clear();
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
