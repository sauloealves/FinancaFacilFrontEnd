import { BrowserRouter, Routes, Route } from "react-router-dom";

import PrivateRoute from "./PrivateRouter";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import AppLayout from "../components/layout/AppLayout/AppLayout";
import DashboardPage from "../pages/Dashboard";
import LaunchesPage from "../pages/LaunchesPage";
import AccountsPage from "../pages/AccountsPage";
import { AccountFilterProvider } from "../contexts/AccountFilterContext";
import { AccountsProvider } from '../contexts/accounts/AccountsProvider';
import { CategoriesProvider } from '../contexts/categories/CategoriesProvider';
import CategoriesPage from "../pages/CategoriesPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />        
        <Route
          element={
            <PrivateRoute>
              <AccountsProvider>
                  <CategoriesProvider>
                    <AccountFilterProvider>
                      <AppLayout />
                    </AccountFilterProvider>
                  </CategoriesProvider>
                </AccountsProvider>
            </PrivateRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/launches" element={<LaunchesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}