import { useState } from "react";
import Button from "../../ui/Button/Button";
import "./Header.css";
import RevenueModal from "../../../features/revenue/RevenueModal";
import ExpenseModal from '../../../features/expense/expenseModal';
import TransferModal from '../../../features/transfer/TransferModal';

type HeaderProps = {
  title?: string;
  month?: string;
  onMonthChange?: (month: string) => void;
};

export default function Header({ title = "Dashboard", month, onMonthChange }: HeaderProps) {
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  
  return (
    <header className="header">
      {/* LEFT */}
      <div className="header-left">
        <h2 className="header-title">{title}</h2>
      </div>

      {/* CENTER */}
      <div className="header-center">
        
        {month && onMonthChange && (
        <input className="header-select"
          type="month"
          value={month}
          onChange={e => onMonthChange(e.target.value)}
        />
      )}
        {/* <select className="header-select">
          <option>Janeiro / 2026</option>
          <option>Fevereiro / 2026</option>
        </select> */}
      </div>

      {/* RIGHT */}
      <div className="header-right">
        <Button onClick={() => setOpenRevenue(true)}>+ Receita</Button>
        <Button variant="danger" onClick={() => setOpenExpense(true)}>+ Despesa</Button>
        <Button variant="secondary" onClick={() => setOpenTransfer(true)}>+ Transferência</Button>

        <RevenueModal
          isOpen={openRevenue}
          onClose={() => setOpenRevenue(false)}
        />

        <TransferModal
          isOpen={openTransfer}
          onClose={() => setOpenTransfer(false)}
        />

        <ExpenseModal
          isOpen={openExpense}
          onClose={() => setOpenExpense(false)}
        />

        <div className="header-user">
          <span className="user-avatar">SA</span>
        </div>
      </div>
    </header>
  );
}
