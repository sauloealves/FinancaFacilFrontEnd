import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";
import Header from "../Header/Header";

import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { usePeriod } from "../../../contexts/usePeriodo";
import { AccountFilterProvider } from "../../../contexts/AccountFilterContext";
import { LaunchesProvider } from "../../../contexts/launches/LaunchesProvider";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Lançamentos",
  "/commitments": "Compromissos",
  "/accounts": "Contas & Cartões",
  "/budget": "Orçamento",
  "/budgets": "Orçamentos",
  "/reports": "Relatórios",
  "/reports/monthly": "Relatórios",
  "/reports/comparison": "Relatórios",
  "/launches": "Lançamentos",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/budgets/")) {
    return "Orçamentos";
  }

  return titles[pathname] ?? "Página Inicial";
}

export default function AppLayout() {
  const sidebarDrawerBreakpoint = 1100;
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const period = usePeriod();
  const shouldShowPeriodControls = ["/", "/launches", "/dashboard"].includes(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  function handleToggleSidebar() {
    if (globalThis.innerWidth <= sidebarDrawerBreakpoint) {
      setIsSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  }

  return (
    <LaunchesProvider>
      <AccountFilterProvider>
        <div className="app-layout">
          <Sidebar
            isOpen={isSidebarOpen}
            isCollapsed={isSidebarCollapsed}
            onClose={() => setIsSidebarOpen(false)}
          />

          <button
            type="button"
            className={`app-sidebar-overlay ${isSidebarOpen ? "visible" : ""}`}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu lateral"
          />

          <div className="app-main">
            <Header
              title={title}
              month={shouldShowPeriodControls ? period.month : undefined}
              periodMode={shouldShowPeriodControls ? period.mode : undefined}
              onPeriodChange={period.setPeriod}
              showImportAction={location.pathname === "/launches"}
              isSidebarOpen={isSidebarOpen}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
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
