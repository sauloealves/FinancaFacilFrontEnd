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
  "/reports": "Relatórios",
  "/launches": "Lançamentos",
};

export default function AppLayout() {
  const location = useLocation();
  const title = titles[location.pathname] ?? "Página Inicial";
  const { month, setMonth } = usePeriod();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  function handleToggleSidebar() {
    if (globalThis.innerWidth <= 960) {
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
              month={["/", "/launches", "/dashboard"].includes(location.pathname) ? month : undefined}
              onMonthChange={setMonth}
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
