import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";
import Header from "../Header/Header";

import { Outlet, useLocation } from "react-router-dom";
import { usePeriod } from "../../../contexts/usePeriodo";

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
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <Header
          title={title}
          month={location.pathname === "/launches" ? month : undefined}
          onMonthChange={setMonth}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
