import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";
import Header from "../Header/Header";

import { Outlet, useLocation } from "react-router-dom";
import { usePeriod } from "../../../contexts/usePeriodo";
import { AccountFilterProvider } from "../../../contexts/AccountFilterContext";
import { LaunchesProvider } from "../../../contexts/launches/LaunchesProvider";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Lançamentos",
  "/commitments": "Compromissos",
  "/accounts": "Contas & Cartões",
  "/budget": "Orçamento",
  "/reports": "Relatórios",
  "/launches": "Lançamentos",
};

export default function AppLayout() {
  const location = useLocation();
  const title = titles[location.pathname] ?? "Página Inicial";
  const { month, setMonth } = usePeriod();

  return (
    <LaunchesProvider>
      <AccountFilterProvider>
        <div className="app-layout">
          <Sidebar />

          <div className="app-main">
            <Header
              title={title}
              month={["/", "/launches", "/dashboard"].includes(location.pathname) ? month : undefined}
              onMonthChange={setMonth}
            />
            <main className="app-content">
              <Outlet />
            </main>
          </div>
        </div>
      </AccountFilterProvider>
    </LaunchesProvider>
  );
}
