import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
