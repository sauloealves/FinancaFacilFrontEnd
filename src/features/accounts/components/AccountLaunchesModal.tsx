import { useEffect, useState } from "react";
import { Button, Modal } from "../../../components/ui";
import { useAccounts } from "../../../contexts/accounts/useAccounts";
import { formatBRLInputSigned } from "../../../utils/currency";
import { formatDateBR } from "../../../utils/date";
import { isTransactionType } from "../../../utils/sortUtils";
import type { Account } from "../types";
import EditLaunchModal from "../../launches/EditLaunchModal";
import type { LaunchRow } from "../../launches/types";
import { getLaunches } from "../../../services/launchService";
import { getErrorMessage } from "../../../services/api";
import "./AccountLaunchesModal.css";

type Props = {
  account: Account;
  onClose: () => void;
  onLaunchUpdated: () => Promise<void>;
};

type AccountLaunchHistoryRow = {
  launch: LaunchRow;
  balance: number;
  signedValue: number;
  typeLabel: string;
};

function buildAccountHistoryFilter(accountId: string) {
  const today = new Date();
  const endDate = new Date(
    today.getFullYear() + 80,
    today.getMonth(),
    today.getDate(),
  );

  return {
    accountId,
    startDate: "1900-01-01",
    endDate: endDate.toISOString().slice(0, 10),
  };
}

function sortLaunches(first: LaunchRow, second: LaunchRow) {
  const dateComparison = first.date.localeCompare(second.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const descriptionComparison = first.description.localeCompare(second.description, "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });

  if (descriptionComparison !== 0) {
    return descriptionComparison;
  }

  return first.id.localeCompare(second.id, "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function belongsToAccount(launch: LaunchRow, accountId: string) {
  if (isTransactionType(launch.type, "transfer")) {
    return launch.fromAccount?.id === accountId || launch.toAccount?.id === accountId;
  }

  return launch.account?.id === accountId;
}

function getSignedValueForAccount(launch: LaunchRow, accountId: string) {
  if (isTransactionType(launch.type, "income") && launch.account?.id === accountId) {
    return launch.value;
  }

  if (isTransactionType(launch.type, "expense") && launch.account?.id === accountId) {
    return -launch.value;
  }

  if (launch.fromAccount?.id === accountId) {
    return -launch.value;
  }

  if (launch.toAccount?.id === accountId) {
    return launch.value;
  }

  return 0;
}

function getTypeLabel(launch: LaunchRow, accountId: string) {
  if (isTransactionType(launch.type, "income")) {
    return "Receita";
  }

  if (isTransactionType(launch.type, "expense")) {
    return "Despesa";
  }

  if (launch.fromAccount?.id === accountId) {
    return "Transferência saída";
  }

  if (launch.toAccount?.id === accountId) {
    return "Transferência entrada";
  }

  return "Transferência";
}

function buildHistoryRows(account: Account, launches: LaunchRow[]) {
  let runningBalance = account.initialBalance;

  return launches
    .filter((launch) => belongsToAccount(launch, account.id))
    .sort(sortLaunches)
    .map((launch) => {
      const signedValue = getSignedValueForAccount(launch, account.id);
      runningBalance += signedValue;

      return {
        launch,
        balance: runningBalance,
        signedValue,
        typeLabel: getTypeLabel(launch, account.id),
      } satisfies AccountLaunchHistoryRow;
    });
}

export default function AccountLaunchesModal({
  account,
  onClose,
  onLaunchUpdated,
}: Readonly<Props>) {
  const [rows, setRows] = useState<AccountLaunchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingLaunch, setEditingLaunch] = useState<LaunchRow | null>(null);
  const { reloadAccounts } = useAccounts();

  async function loadLaunchesHistory() {
    setLoading(true);
    setError("");

    try {
      const allLaunches = await getLaunches(buildAccountHistoryFilter(account.id));
      setRows(buildHistoryRows(account, allLaunches));
    } catch (err) {
      setRows([]);
      setError(getErrorMessage(err, "Não foi possível carregar os lançamentos da conta."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLaunchesHistory();
  }, [account.id]);

  const currentBalance = rows.at(-1)?.balance ?? account.initialBalance;

  return (
    <>
      <Modal
        isOpen
        title={`Lançamentos da conta ${account.name}`}
        onClose={onClose}
        size="fullscreen"
        className="account-launches-modal"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <div className="account-launches-modal__summary">
          <div className="account-launches-modal__summary-card">
            <span className="account-launches-modal__summary-label">Saldo inicial</span>
            <strong>{formatBRLInputSigned(account.initialBalance)}</strong>
          </div>
          <div className="account-launches-modal__summary-card">
            <span className="account-launches-modal__summary-label">Saldo atual no histórico</span>
            <strong>{formatBRLInputSigned(currentBalance)}</strong>
          </div>
          <div className="account-launches-modal__summary-card">
            <span className="account-launches-modal__summary-label">Lançamentos</span>
            <strong>{rows.length}</strong>
          </div>
        </div>

        <div className="account-launches-modal__hint">
          Clique em uma linha para editar o lançamento.
        </div>

        {loading && (
          <div className="account-launches-modal__state">Carregando histórico da conta...</div>
        )}

        {!loading && error && (
          <div className="account-launches-modal__state account-launches-modal__state-error">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="account-launches-modal__state">
            Nenhum lançamento encontrado para esta conta.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="account-launches-modal__table-wrap">
            <table className="account-launches-modal__table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th className="account-launches-modal__number">Valor</th>
                  <th className="account-launches-modal__number">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.launch.id}
                    className="account-launches-modal__row"
                    onClick={() => setEditingLaunch(row.launch)}
                  >
                    <td>{formatDateBR(row.launch.date)}</td>
                    <td>{row.typeLabel}</td>
                    <td>{row.launch.description}</td>
                    <td
                      className={`account-launches-modal__number ${row.signedValue < 0 ? "is-negative" : "is-positive"}`}
                    >
                      {formatBRLInputSigned(row.signedValue)}
                    </td>
                    <td
                      className={`account-launches-modal__number ${row.balance < 0 ? "is-negative" : ""}`}
                    >
                      {formatBRLInputSigned(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {editingLaunch && (
        <EditLaunchModal
          launch={editingLaunch}
          onClose={() => setEditingLaunch(null)}
          onSave={async () => {
            await onLaunchUpdated();
            await reloadAccounts();
            await loadLaunchesHistory();
            setEditingLaunch(null);
          }}
        />
      )}
    </>
  );
}