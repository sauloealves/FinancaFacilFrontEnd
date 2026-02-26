// src/main.tsx
import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router";
import { PeriodProvider } from "./contexts/PeriodProvider";
import { AuthProvider } from "./contexts/auth/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PeriodProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </PeriodProvider>
  </React.StrictMode>
); 