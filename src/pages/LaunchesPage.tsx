import { useState, useEffect } from "react";
import LaunchTable from "../features/launches/LauncheTable";
import { normalizeLaunches } from "../features/launches/normalizeLaunches";
import { usePeriod } from "../contexts/usePeriodo";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import type { LaunchRow, LaunchSortField } from "../features/launches/types";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { isTransactionType } from "../utils/sortUtils";
import { Button, Modal } from "../components/ui";
import {
  deleteLaunch,
  getOpeningBalance,
  type DeleteLaunchScope,
} from "../services/launchService";
import "./LaunchesPage.css";

function isSeriesLaunch(row: LaunchRow) {
  return row.occurrenceType === "installment" || row.occurrenceType === "recurring";
}

function getAccountLabel(row: LaunchRow) {
  if (isTransactionType(row.type, "transfer")) {
    return `${row.fromAccount?.name ?? ""} ${row.toAccount?.name ?? ""}`.trim();
  }

  return row.account?.name ?? "";
}

function getCategoryLabel(row: LaunchRow) {
  if (isTransactionType(row.type, "transfer")) {
    return "Transferência";
  }

  return row.category?.name ?? "";
}

function compareText(first: string, second: string) {
  return first.localeCompare(second, "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function getSortValue(row: LaunchRow, sortField: Exclude<LaunchSortField, "default" | "value">) {
  if (sortField === "description") {
    return row.description;
  }

  if (sortField === "account") {
    return getAccountLabel(row);
  }

  return getCategoryLabel(row);
}

function getSignedSortValue(row: LaunchRow) {
  if (isTransactionType(row.type, "expense")) {
    return -row.value;
  }

  return row.value;
}

function sortDayRows(rows: LaunchRow[], sortField: LaunchSortField) {
  if (sortField === "default") {
    return rows;
  }

  return [...rows].sort((first, second) => {
    if (sortField === "value") {
      const valueDifference = getSignedSortValue(first) - getSignedSortValue(second);

      if (valueDifference !== 0) {
        return valueDifference;
      }
    } else {
      const firstValue = getSortValue(first, sortField);
      const secondValue = getSortValue(second, sortField);
      const textDifference = compareText(firstValue, secondValue);

      if (textDifference !== 0) {
        return textDifference;
      }
    }

    const descriptionDifference = compareText(first.description, second.description);

    if (descriptionDifference !== 0) {
      return descriptionDifference;
    }

    return compareText(first.id, second.id);
  });
}

function buildDeleteTargets(rows: LaunchRow[], scope: DeleteLaunchScope) {
  const targets = new Map<string, LaunchRow>();

  for (const row of rows) {
    if (scope === "OnlyThis" || !row.groupId || !isSeriesLaunch(row)) {
      targets.set(`${scope}:${row.id}`, row);
      continue;
    }

    const groupKey = `${scope}:${row.groupId}`;
    const currentTarget = targets.get(groupKey);

    if (!currentTarget) {
      targets.set(groupKey, row);
      continue;
    }

    if (scope === "FromThis" && row.date.localeCompare(currentTarget.date) < 0) {
      targets.set(groupKey, row);
    }
  }

  return [...targets.values()];
}

function getDeleteTargetRows(
  isBatchDeleteOpen: boolean,
  selectedRows: LaunchRow[],
  pendingDelete: LaunchRow | null,
  scope?: DeleteLaunchScope,
) {
  if (isBatchDeleteOpen) {
    if (!scope) {
      return selectedRows;
    }

    return buildDeleteTargets(selectedRows, scope);
  }

  if (!pendingDelete) {
    return [];
  }

  return [pendingDelete];
}

function getDeleteModalMessage(
  isBatchDeleteOpen: boolean,
  isSeriesDelete: boolean,
  selectedCount: number,
) {
  if (isBatchDeleteOpen) {
    if (isSeriesDelete) {
      return `Você selecionou ${selectedCount} lançamentos. Alguns fazem parte de recorrências ou parcelamentos; a opção escolhida será aplicada em lote.`;
    }

    return `Deseja realmente excluir os ${selectedCount} lançamentos selecionados?`;
  }

  if (isSeriesDelete) {
    return "Esse lançamento faz parte de uma recorrência/parcelamento. Escolha como deseja excluir.";
  }

  return "Deseja realmente excluir esta transação?";
}

/**
 * Página de Lançamentos
 * Caminho: /launches
 */
export default function LaunchesPage() {
  const { month } = usePeriod();
  const [editing, setEditing] = useState<LaunchRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LaunchRow | null>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [sortField, setSortField] = useState<LaunchSortField>("default");
  const [selectedLaunchIds, setSelectedLaunchIds] = useState<string[]>([]);
  const [historicalOpeningBalance, setHistoricalOpeningBalance] = useState<number>(0);
  const [ignoreHistoricalBalance, setIgnoreHistoricalBalance] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const { selectedAccounts } = useAccountFilter();
  const { launches, reloadLaunches } = useLaunches();
  const { reloadAccounts } = useAccounts();

  useEffect(() => {
    const loadBalance = async () => {
      setLoadingBalance(true);
      const [year, monthNum] = month.split("-");

      const balance = await getOpeningBalance(
        Number(year),
        Number(monthNum),
        1,
        selectedAccounts.length > 0 ? selectedAccounts : undefined,
      );

      setHistoricalOpeningBalance(balance);
      setLoadingBalance(false);
    };

    void loadBalance();
  }, [month, selectedAccounts]);

  const openingBalance = ignoreHistoricalBalance ? 0 : historicalOpeningBalance;

  const filteredLaunches =
    selectedAccounts.length === 0
      ? launches
      : launches.filter((launch) => {
          if (isTransactionType(launch.type, "transfer")) {
            return (
              selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
              selectedAccounts.includes(launch.toAccount?.id ?? "")
            );
          }

          return selectedAccounts.includes(launch.account?.id ?? "");
        });

  const tableData = normalizeLaunches({
    month,
    openingBalance,
    launches: filteredLaunches,
    selectedAccounts,
  });

  const sortedTableData = {
    ...tableData,
    days: tableData.days.map((day) => ({
      ...day,
      rows: sortDayRows(day.rows, sortField),
    })),
  };

  const visibleRows = sortedTableData.days.flatMap((day) => day.rows);
  const visibleLaunchIds = visibleRows.map((row) => row.id);
  const selectedRows = visibleRows.filter((row) => selectedLaunchIds.includes(row.id));
  const allVisibleSelected =
    visibleLaunchIds.length > 0 && visibleLaunchIds.every((id) => selectedLaunchIds.includes(id));

  useEffect(() => {
    setSelectedLaunchIds((current) => {
      const next = current.filter((id) => visibleLaunchIds.includes(id));

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [visibleLaunchIds]);

  function closeDeleteModal() {
    if (isDeleting) return;
    setPendingDelete(null);
    setIsBatchDeleteOpen(false);
    setDeleteError("");
  }

  async function confirmDelete(scope: DeleteLaunchScope) {
    const targetRows = getDeleteTargetRows(isBatchDeleteOpen, selectedRows, pendingDelete, scope);

    if (targetRows.length === 0) return;

    setIsDeleting(true);
    setDeleteError("");

    let failedDeletes = 0;

    try {
      for (const row of targetRows) {
        try {
          await deleteLaunch(row, scope);
        } catch {
          failedDeletes += 1;
        }
      }

      await reloadLaunches();
      await reloadAccounts();

      if (failedDeletes > 0) {
        setDeleteError(
          isBatchDeleteOpen
            ? "Nem todos os lançamentos selecionados puderam ser excluídos."
            : "Não foi possível excluir a transação.",
        );
        return;
      }

      setPendingDelete(null);
      setIsBatchDeleteOpen(false);
      setSelectedLaunchIds([]);
    } catch {
      setDeleteError(
        isBatchDeleteOpen
          ? "Não foi possível concluir a exclusão em lote."
          : "Não foi possível excluir a transação.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDelete(row: LaunchRow) {
    setDeleteError("");
    setIsBatchDeleteOpen(false);
    setPendingDelete(row);
  }

  function handleToggleLaunchSelection(rowId: string, checked: boolean) {
    setSelectedLaunchIds((current) => {
      if (checked) {
        if (current.includes(rowId)) {
          return current;
        }

        return [...current, rowId];
      }

      return current.filter((id) => id !== rowId);
    });
  }

  function handleToggleSelectAllVisible() {
    setSelectedLaunchIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleLaunchIds.includes(id));
      }

      const next = [...current];

      for (const id of visibleLaunchIds) {
        if (!next.includes(id)) {
          next.push(id);
        }
      }

      return next;
    });
  }

  function handleClearSelection() {
    setSelectedLaunchIds([]);
  }

  function handleDeleteSelected() {
    if (selectedRows.length === 0) return;

    setDeleteError("");
    setPendingDelete(null);
    setIsBatchDeleteOpen(true);
  }

  const deleteTargets = getDeleteTargetRows(isBatchDeleteOpen, selectedRows, pendingDelete);
  const isSeriesDelete = deleteTargets.some((row) => isSeriesLaunch(row));
  const isDeleteModalOpen = isBatchDeleteOpen ? selectedRows.length > 0 : !!pendingDelete;
  const deleteModalMessage = getDeleteModalMessage(
    isBatchDeleteOpen,
    isSeriesDelete,
    selectedRows.length,
  );

  return (
    <div className="launches-page">
      {loadingBalance ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Carregando saldo inicial...</div>
      ) : (
        <LaunchTable
          data={sortedTableData}
          sortField={sortField}
          onSortFieldChange={setSortField}
          selectedCount={selectedRows.length}
          allVisibleSelected={allVisibleSelected}
          onToggleSelectAllVisible={handleToggleSelectAllVisible}
          onClearSelection={handleClearSelection}
          onDeleteSelected={handleDeleteSelected}
          ignoreHistoricalBalance={ignoreHistoricalBalance}
          onIgnoreHistoricalBalanceChange={setIgnoreHistoricalBalance}
          selectedLaunchIds={selectedLaunchIds}
          onToggleLaunchSelection={handleToggleLaunchSelection}
          onEdit={(row) => setEditing(row)}
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
        isOpen={isDeleteModalOpen}
        title={isBatchDeleteOpen ? "Excluir selecionados" : "Confirmar exclusão"}
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
          {deleteModalMessage}
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


