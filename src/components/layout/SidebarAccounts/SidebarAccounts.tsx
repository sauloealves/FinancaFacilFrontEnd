import { useEffect } from "react";
import { useAccountFilter } from "../../../contexts/AccountFilterContext";
import { useAccounts } from "../../../contexts/accounts/useAccounts";
import { formatBRLInputSigned } from "../../../utils/currency";
import "./SidebarAccounts.css";

export default function SidebarAccounts() {
  const { accounts } = useAccounts();
  const { selectedAccounts, toggleAccount, pruneSelectedAccounts } = useAccountFilter();
  const visibleAccounts = accounts.filter((account) => account?.id && account.isEnabled);

  useEffect(() => {
    pruneSelectedAccounts(visibleAccounts.map((account) => account.id));
  }, [pruneSelectedAccounts, visibleAccounts]);

  return (
    <div className="sidebar-accounts">
      {visibleAccounts.map(account => {
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
              aria-checked={isSelected}
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
