import { formatBRLInputSigned } from "../../../utils/currency";
import type { Account } from "../types";

type Props = {
  accounts: Account[];
  emptyMessage: string;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (account: Account) => void;
};

export default function AccountTable({
  accounts,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleEnabled,
}: Readonly<Props>) {
  if (accounts.length === 0) {
    return <div className="accounts-empty-state">{emptyMessage}</div>;
  }

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
            <td data-label="Nome">{account.name}</td>

            <td data-label="Saldo Inicial">
              {formatBRLInputSigned(
                account.initialBalance
              )}
            </td>

            <td
              data-label="Saldo Atual"
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

            <td data-label="Ações">
              <div className="account-actions">
                <button
                    className="btn-action edit"
                    onClick={() => onEdit(account)}
                >
                    ✏ Editar
                </button>

                <button
                  className={`btn-action ${account.isEnabled ? "disable" : "enable"}`}
                  onClick={() => onToggleEnabled(account)}
                >
                  {account.isEnabled ? "Inativar" : "Habilitar"}
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