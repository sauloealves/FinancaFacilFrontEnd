import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import PrivateRoute from "./PrivateRouter";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import HomePage from "../pages/HomePage";
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
import ReportByTagPage from "../pages/ReportByTagPage";
import BudgetsPage from "../pages/BudgetsPage";
import BudgetDetailPage from "../pages/BudgetDetailPage";
import { TagsProvider } from "../contexts/tags/TagsProvider";
import TagsPage from "../pages/TagsPage";
import TagDetailPage from "../pages/TagDetailPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <PrivateRoute>
              <AccountsProvider>
                  <CategoriesProvider>
                    <TagsProvider>
                      <AccountFilterProvider>
                        <AppLayout />
                      </AccountFilterProvider>
                    </TagsProvider>
                  </CategoriesProvider>
                </AccountsProvider>
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/launches" element={<LaunchesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/budgets/:budgetId" element={<BudgetDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/tags/:id" element={<TagDetailPage />} />
          <Route path="/reports" element={<Navigate to="/reports/monthly" replace />} />
          <Route path="/reports/monthly" element={<ReportsPage />} />
          <Route path="/reports/comparison" element={<ReportComparisonPage />} />
          <Route path="/reports/tags" element={<ReportByTagPage />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}