import { formatDateBR } from "../../utils/date";
import { isTransactionType } from "../../utils/sortUtils";
import { calculateLaunchBalanceImpact } from "./normalizeLaunches";
import LaunchesViewControls from "./LaunchesViewControls";
import type { LaunchRow, LaunchSortField, LaunchViewMode } from "./types";
import "./LaunchRow.css";
import "./LaunchSpreadsheetView.css";
import CategoryTagsTooltip from "../tags/CategoryTagsTooltip";

type SpreadsheetLaunchRow = LaunchRow & {
  runningBalance: number;
};

type LaunchSpreadsheetViewProps = {
  month: string;
  openingBalance: number;
  rows: SpreadsheetLaunchRow[];
  selectedAccounts: string[];
  sortField: LaunchSortField;
  onSortFieldChange: (field: LaunchSortField) => void;
  viewMode: LaunchViewMode;
  onViewModeChange: (mode: LaunchViewMode) => void;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleSelectAllVisible: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  ignoreHistoricalBalance: boolean;
  onIgnoreHistoricalBalanceChange: (checked: boolean) => void;
  selectedLaunchIds: string[];
  onToggleLaunchSelection: (rowId: string, checked: boolean) => void;
  onEdit: (row: LaunchRow) => void;
  onDelete: (row: LaunchRow) => void;
};

function getTypeLabel(row: LaunchRow) {
  if (isTransactionType(row.type, "income")) {
    return "Receita";
  }

  if (isTransactionType(row.type, "expense")) {
    return "Despesa";
  }

  return "Transf";
}

function getAccountLabel(row: LaunchRow) {
  if (isTransactionType(row.type, "transfer")) {
    return `${row.fromAccount?.name ?? "-"} -> ${row.toAccount?.name ?? "-"}`;
  }

  return row.account?.name ?? "-";
}

function getCategoryLabel(row: LaunchRow) {
  if (isTransactionType(row.type, "transfer")) {
    return "-";
  }

  return row.category?.name ?? "-";
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatValue(row: LaunchRow, selectedAccounts: string[]) {
  const impact = calculateLaunchBalanceImpact(row, selectedAccounts);
  const formattedValue = formatCurrency(row.value);

  if (impact > 0) {
    return `+${formattedValue}`;
  }

  if (impact < 0) {
    return `-${formattedValue}`;
  }

  return formattedValue;
}

function getValueTone(row: LaunchRow, selectedAccounts: string[]) {
  const impact = calculateLaunchBalanceImpact(row, selectedAccounts);

  if (impact > 0) {
    return "is-positive";
  }

  if (impact < 0) {
    return "is-negative";
  }

  return "is-neutral";
}

function buildDayBandMap(rows: SpreadsheetLaunchRow[]) {
  const dayBandMap = new Map<string, "day-band-even" | "day-band-odd">();
  let previousDate = "";
  let isEvenBand = false;

  for (const row of rows) {
    if (row.date !== previousDate) {
      isEvenBand = !isEvenBand;
      previousDate = row.date;
    }

    dayBandMap.set(row.id, isEvenBand ? "day-band-even" : "day-band-odd");
  }

  return dayBandMap;
}

function stopRowDoubleClick(event: React.MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function renderDescription(row: LaunchRow) {
  const description = isTransactionType(row.type, "transfer") ? "Transferência" : row.description;

  return (
    <span className="launch-spreadsheet-description-content">
      <span>{description}</span>
      {isTransactionType(row.type, "transfer") && (
        <span className="occurrence-tag transfer-tag">Transfer</span>
      )}
      {row.occurrenceType === "installment" && (
        <span className="occurrence-tag installment-tag">Parcelado</span>
      )}
      {row.occurrenceType === "recurring" && (
        <span className="occurrence-tag recurring-tag">Recorrente</span>
      )}
    </span>
  );
}

export default function LaunchSpreadsheetView({
  month,
  openingBalance,
  rows,
  selectedAccounts,
  sortField,
  onSortFieldChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  allVisibleSelected,
  onToggleSelectAllVisible,
  onClearSelection,
  onDeleteSelected,
  ignoreHistoricalBalance,
  onIgnoreHistoricalBalanceChange,
  selectedLaunchIds,
  onToggleLaunchSelection,
  onEdit,
  onDelete,
}: Readonly<LaunchSpreadsheetViewProps>) {
  const dayBandMap = buildDayBandMap(rows);

  return (
    <div className="launch-table launch-spreadsheet-view">
      <LaunchesViewControls
        month={month}
        openingBalance={openingBalance}
        sortField={sortField}
        onSortFieldChange={onSortFieldChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        selectedCount={selectedCount}
        allVisibleSelected={allVisibleSelected}
        onToggleSelectAllVisible={onToggleSelectAllVisible}
        onClearSelection={onClearSelection}
        onDeleteSelected={onDeleteSelected}
        ignoreHistoricalBalance={ignoreHistoricalBalance}
        onIgnoreHistoricalBalanceChange={onIgnoreHistoricalBalanceChange}
      />

      <div className="launch-spreadsheet-shell">
        <div className="launch-spreadsheet-scroll">
          <table className="launch-spreadsheet-table">
            <thead>
              <tr>
                <th className="launch-spreadsheet-checkbox-cell">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Conta</th>
                <th>Categoria</th>
                <th className="launch-spreadsheet-number-cell">Valor</th>
                <th className="launch-spreadsheet-number-cell">Saldo</th>
                <th className="launch-spreadsheet-actions-cell">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="launch-spreadsheet-empty" colSpan={9}>
                    Nenhum lançamento encontrado no período selecionado.
                  </td>
                </tr>
              )}

              {rows.map((row) => {
                const valueTone = getValueTone(row, selectedAccounts);

                return (
                  <tr
                    key={row.id}
                    className={`${dayBandMap.get(row.id) ?? "day-band-even"} ${selectedLaunchIds.includes(row.id) ? "is-selected" : ""}`.trim()}
                    onDoubleClick={() => onEdit(row)}
                  >
                    <td className="launch-spreadsheet-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedLaunchIds.includes(row.id)}
                        aria-label={`Selecionar lançamento ${row.description}`}
                        onChange={(event) => onToggleLaunchSelection(row.id, event.target.checked)}
                        onDoubleClick={stopRowDoubleClick}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="launch-spreadsheet-cell-button"
                        onClick={() => onEdit(row)}
                        onDoubleClick={stopRowDoubleClick}
                      >
                        {formatDateBR(row.date)}
                      </button>
                    </td>
                    <td>{getTypeLabel(row)}</td>
                    <td>
                      <button
                        type="button"
                        className="launch-spreadsheet-cell-button"
                        onClick={() => onEdit(row)}
                        onDoubleClick={stopRowDoubleClick}
                      >
                        {renderDescription(row)}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="launch-spreadsheet-cell-button"
                        onClick={() => onEdit(row)}
                        onDoubleClick={stopRowDoubleClick}
                      >
                        {getAccountLabel(row)}
                      </button>
                    </td>
                    <td>
                      {isTransactionType(row.type, "transfer") ? (
                        "-"
                      ) : (
                        <CategoryTagsTooltip categoryId={row.category?.id}>
                          <span>{getCategoryLabel(row)}</span>
                        </CategoryTagsTooltip>
                      )}
                    </td>
                    <td className={`launch-spreadsheet-number-cell ${valueTone}`}>
                      {formatValue(row, selectedAccounts)}
                    </td>
                    <td
                      className={`launch-spreadsheet-number-cell ${row.runningBalance < 0 ? "is-negative" : "is-neutral"}`}
                    >
                      {formatCurrency(row.runningBalance)}
                    </td>
                    <td className="launch-spreadsheet-actions-cell">
                      <div className="launch-spreadsheet-actions">
                        <button
                          type="button"
                          className="row-action-button"
                          title="Editar transação"
                          aria-label="Editar transação"
                          onClick={() => onEdit(row)}
                          onDoubleClick={stopRowDoubleClick}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="row-action-button delete-transaction-button"
                          title="Excluir transação"
                          aria-label="Excluir transação"
                          onClick={() => onDelete(row)}
                          onDoubleClick={stopRowDoubleClick}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}