import type { ReactNode } from "react";
import { formatMonthBR } from "../../utils/date";
import type { LaunchSortField, LaunchViewMode } from "./types";
import "./LauncheTable.css";

type LaunchesViewControlsProps = {
  month: string;
  openingBalance: number;
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
  footerActions?: ReactNode;
};

export default function LaunchesViewControls({
  month,
  openingBalance,
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
  footerActions,
}: Readonly<LaunchesViewControlsProps>) {
  const hasSelection = selectedCount > 0;
  const selectionLabel = `${selectedCount} ${selectedCount === 1 ? "selecionado" : "selecionados"}`;

  return (
    <div className="launch-table-header">
      <h2>{formatMonthBR(month)}</h2>
      <div className="opening-balance-group">
        <div className="launch-table-toolbar">
          <div className="view-mode-group" role="group" aria-label="Modo de visualização">
            <button
              type="button"
              className={`view-mode-button ${viewMode === "grouped" ? "is-active" : ""}`}
              onClick={() => onViewModeChange("grouped")}
            >
              Padrão
            </button>
            <button
              type="button"
              className={`view-mode-button ${viewMode === "spreadsheet" ? "is-active" : ""}`}
              onClick={() => onViewModeChange("spreadsheet")}
            >
              Planilha
            </button>
          </div>

          <label className="sort-control">
            <span>Ordenar no dia por</span>
            <select
              value={sortField}
              onChange={(event) => onSortFieldChange(event.target.value as LaunchSortField)}
            >
              <option value="default">Padrão</option>
              <option value="description">Descrição</option>
              <option value="account">Conta</option>
              <option value="category">Categoria</option>
              <option value="value">Valor</option>
            </select>
          </label>

          {hasSelection && (
            <div className="bulk-actions" aria-live="polite">
              <span className="bulk-selection-count">{selectionLabel}</span>
              <button type="button" className="collapse-all-button" onClick={onToggleSelectAllVisible}>
                {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </button>
              <button type="button" className="secondary-inline-button" onClick={onClearSelection}>
                Limpar
              </button>
              <button type="button" className="danger-inline-button" onClick={onDeleteSelected}>
                Excluir selecionados
              </button>
            </div>
          )}
        </div>

        <div className="opening-balance-row">
          <span className="opening-balance">
            Saldo inicial:{" "}
            {openingBalance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>

          <label className="opening-balance-toggle">
            <input
              type="checkbox"
              checked={ignoreHistoricalBalance}
              onChange={(event) => onIgnoreHistoricalBalanceChange(event.target.checked)}
            />
            <span>Ocultar saldo do mês anterior</span>
          </label>
        </div>

        {footerActions}
      </div>
    </div>
  );
}