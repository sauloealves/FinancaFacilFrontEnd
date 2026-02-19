import { useEffect, useState } from "react";
import { getAccounts } from "../services/accountService";
import { formatBRLInputSigned } from "../utils/currency";
import { useLaunches } from "../contexts/launches/useLaunches";
import type { Account } from "../features/accounts/types";
import { calculateAccountCurrentBalance } from "../utils/calculateAccountCurrentBalance";
import "./AccountsPage.css";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const { launches } = useLaunches();

  useEffect(() => {
    async function loadAccounts() {
        setLoading(true);
        const data = await getAccounts();
        setAccounts(data);
        setLoading(false);
    }

    loadAccounts();
   }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="accounts-page">
      <h2>Contas</h2>

      <table className="accounts-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Saldo Inicial</th>
            <th>Saldo Atual</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map(account => {
            const currentBalance =
              calculateAccountCurrentBalance(
                account,
                launches
              );

            return (
              <tr key={account.id}>
                <td>{account.name}</td>

                <td>
                  {formatBRLInputSigned(
                    account.initialBalance
                  )}
                </td>

                <td
                  className={
                    currentBalance < 0
                      ? "negative"
                      : ""
                  }
                >
                  {formatBRLInputSigned(
                    currentBalance
                  )}
                </td>

                <td>
                  {/* Depois colocamos Edit / Delete */}
                  -
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
