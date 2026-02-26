import { useAccountFilter } from "../../../contexts/AccountFilterContext";
import { useAccounts } from "../../../contexts/accounts/useAccounts";

import { launches } from "../../../data/launches";
import { calculateAccountBalances } from "../../../features/accounts/calculateAccountBalances";
import { formatBRLInputSigned } from "../../../utils/currency";
import "./SidebarAccounts.css";



export default function SidebarAccounts() {
  const { accounts } = useAccounts();
    const { selectedAccounts, toggleAccount } = useAccountFilter();
    const balances = calculateAccountBalances(launches);

  return (
    <div className="sidebar-accounts">
      {accounts.map(account => {
        const isSelected = selectedAccounts.includes(account.id);

        return (
          <label
            key={account.id}
            className={`sidebar-account-item ${
              isSelected ? "active" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleAccount(account.id)}
            />

            <span className="account-name">
              {account.name}
            </span>

            <span className="account-balance">
              {formatBRLInputSigned(
                account.currentBalance ?? 0
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
