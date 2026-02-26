import { Routes, Route } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout/AppLayout";
import DashboardPage from "../../pages/Dashboard";
import LaunchesPage from "../../pages/LaunchesPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/launches" element={<LaunchesPage />} />
        {/* <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/commitments" element={<CommitmentsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} /> */}

        {/* <Route path="/settings" element={<SettingsLayout />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="payment-methods" element={<PaymentMethodsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="plan" element={<PlanPage />} />
        </Route> */}
      </Route>
    </Routes>
  );
}
