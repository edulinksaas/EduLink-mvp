import "./index.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import "./styles/variables.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/auth.css";
import "./styles/academy.css";
import "./styles/report.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

