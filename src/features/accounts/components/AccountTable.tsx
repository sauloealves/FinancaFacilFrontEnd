import { formatBRLInputSigned } from "../../../utils/currency";
import type { Account } from "../types";

type Props = {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  balances: Record<string, number>;
};

export default function AccountTable({
  accounts,
  onEdit,
  onDelete,
  balances,
}: Props) {
  return (
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
        {accounts.map((account) => (
          <tr key={account.id}>
            <td>{account.name}</td>

            <td>
              {formatBRLInputSigned(
                account.initialBalance
              )}
            </td>

            <td
              className={
                account.currentBalance < 0
                  ? "negative"
                  : ""
              }
            >
              {formatBRLInputSigned(
                account.currentBalance
              )}
            </td>

            <td>
              <div className="account-actions">
                <button
                    className="btn-action edit"
                    onClick={() => onEdit(account)}
                >
                    ✏ Editar
                </button>

                <button
                    className="btn-action delete"
                    onClick={() => onDelete(account.id)}
                >
                    🗑 Excluir
                </button>
                </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}