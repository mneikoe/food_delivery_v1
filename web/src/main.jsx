import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { message } from 'antd'
import './index.css'
import App from './App.jsx'

// Configure Ant Design message globally
message.config({
  top: 70,
  duration: 4,
  maxCount: 3,
});

// Make message available globally for API interceptors
window.antMessage = message;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
