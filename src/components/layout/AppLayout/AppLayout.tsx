import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";
import Header from "../Header/Header";
import DashboardPage from "../../../pages/Dashboard";
import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Lançamentos",
  "/commitments": "Compromissos",
  "/accounts": "Contas & Cartões",
  "/budget": "Orçamento",
  "/reports": "Relatórios",
};

export default function AppLayout() {
  const location = useLocation();
  const title = titles[location.pathname] ?? "Página Inicial";
  
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <Header title={title} />
        <main className="app-content">
          <DashboardPage/>
        </main>
      </div>
    </div>
  );
}
