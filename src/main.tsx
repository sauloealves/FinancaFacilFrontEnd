// src/main.tsx
import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router";
import { PeriodProvider } from "./contexts/PeriodProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PeriodProvider>
      <AppRouter />
    </PeriodProvider>
  </React.StrictMode>
); 