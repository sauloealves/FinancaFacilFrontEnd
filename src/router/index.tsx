import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import PrivateRoute from "./PrivateRouter";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import AppLayout from "../components/layout/AppLayout/AppLayout";
import DashboardPage from "../pages/Dashboard";
import LaunchesPage from "../pages/LaunchesPage";
import AccountsPage from "../pages/AccountsPage";
import { AccountFilterProvider } from "../contexts/AccountFilterContext";
import { AccountsProvider } from '../contexts/accounts/AccountsProvider';
import { CategoriesProvider } from '../contexts/categories/CategoriesProvider';
import CategoriesPage from "../pages/CategoriesPage";
import ReportsPage from "../pages/ReportsPage";
import ReportComparisonPage from "../pages/ReportComparisonPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/reports" element={<Navigate to="/reports/monthly" replace />} />
          <Route path="/reports/monthly" element={<ReportsPage />} />
          <Route path="/reports/comparison" element={<ReportComparisonPage />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}