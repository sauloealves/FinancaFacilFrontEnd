import { useState, useEffect } from "react";
import LaunchTable from "../features/launches/LauncheTable";
import { normalizeLaunches } from "../features/launches/normalizeLaunches";
import { usePeriod } from "../contexts/usePeriodo";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import type { LaunchRow } from "../features/launches/types";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { isTransactionType } from "../utils/sortUtils";
import ImportTransactionsAction from "../features/import/ImportTransactionsAction";
import { Button, Modal } from "../components/ui";
import {
  deleteLaunch,
  getOpeningBalance,
  type DeleteLaunchScope,
} from "../services/launchService";
import "./LaunchesPage.css";

/**
 * Página de Lançamentos
 * Caminho: /launches
 */
export default function LaunchesPage() {
  const { month } = usePeriod();
  const [editing, setEditing] = useState<LaunchRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LaunchRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const { selectedAccounts } = useAccountFilter();
  const { launches, reloadLaunches } = useLaunches();
  const { reloadAccounts } = useAccounts();

  // Carrega o saldo inicial quando o mês ou contas selecionadas mudarem
  useEffect(() => {
    const loadBalance = async () => {
      setLoadingBalance(true);
      const [year, monthNum] = month.split("-");
      // Se há contas selecionadas, busca saldo apenas delas; caso contrário, busca total
      const balance = await getOpeningBalance(
        Number(year), 
        Number(monthNum), 
        1,
        selectedAccounts.length > 0 ? selectedAccounts : undefined
      );
      setOpeningBalance(balance);
      setLoadingBalance(false);
    };

    loadBalance();
  }, [month, selectedAccounts]);

  const filteredLaunches =
  selectedAccounts.length === 0
    ? launches
    : launches.filter(l => {
        if (isTransactionType(l.type, "transfer")) {
          return (
            selectedAccounts.includes(l.fromAccount?.id ?? "") ||
            selectedAccounts.includes(l.toAccount?.id ?? "")
          );
        }

        return selectedAccounts.includes(l.account?.id ?? "");
      });

  const tableData = normalizeLaunches({
    month: month,
    openingBalance: openingBalance,
    launches: filteredLaunches,
  });

  function closeDeleteModal() {
    if (isDeleting) return;
    setPendingDelete(null);
    setDeleteError("");
  }

  async function confirmDelete(scope: DeleteLaunchScope) {
    if (!pendingDelete) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteLaunch(pendingDelete.id, scope);
      await reloadLaunches();
      await reloadAccounts();
      setPendingDelete(null);
    } catch {
      setDeleteError("Não foi possível excluir a transação.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDelete(row: LaunchRow) {
    setDeleteError("");
    setPendingDelete(row);
  }

  const isSeriesDelete =
    pendingDelete?.occurrenceType === "installment" ||
    pendingDelete?.occurrenceType === "recurring";
    

  return (
    <div className="launches-page">
      <div className="launches-page-header">
        <ImportTransactionsAction />
      </div>

      {loadingBalance ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Carregando saldo inicial...</div>
      ) : (
        <LaunchTable data={tableData} 
          onEdit={row => setEditing(row)}
          onDelete={handleDelete}
        />
      )}
      {editing && (
      <EditLaunchModal
        launch={editing}
        onClose={() => setEditing(null)}
        onSave={async () => {
            await reloadLaunches();
            await reloadAccounts();
            setEditing(null);
          }}
      />
    )}

      <Modal
        isOpen={!!pendingDelete}
        title="Confirmar exclusão"
        onClose={closeDeleteModal}
        size="md"
        footer={
          isSeriesDelete ? (
            <>
              <Button variant="secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button onClick={() => void confirmDelete("OnlyThis")} disabled={isDeleting}>
                Somente esta
              </Button>
              <Button variant="danger" onClick={() => void confirmDelete("FromFirst")} disabled={isDeleting}>
                Desde a primeira
              </Button>
              <Button variant="danger" onClick={() => void confirmDelete("FromThis")} disabled={isDeleting}>
                Desta para frente
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void confirmDelete("OnlyThis")} disabled={isDeleting}>
                Excluir
              </Button>
            </>
          )
        }
      >
        <p style={{ margin: 0 }}>
          {isSeriesDelete
            ? "Esse lançamento faz parte de uma recorrência/parcelamento. Escolha como deseja excluir."
            : "Deseja realmente excluir esta transação?"}
        </p>
        {deleteError && (
          <p style={{ marginTop: 12, color: "#b42318" }}>
            {deleteError}
          </p>
        )}
      </Modal>

    </div>
  );
}


