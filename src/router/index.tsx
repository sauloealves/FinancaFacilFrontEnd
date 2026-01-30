import { BrowserRouter, Routes, Route } from "react-router-dom";

import PrivateRoute from "./PrivateRouter";
import Dashboard from "../pages/Dashboard";
import PrivateLayout from "../layouts/PrivateLayout";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import AppLayout from "../components/layout/AppLayout/AppLayout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/" 
          element={
            <PrivateRoute>
              <AppLayout>                
              </AppLayout>              
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}