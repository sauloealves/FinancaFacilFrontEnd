import { useState } from "react";
import type { LaunchRow, LaunchSortField, LaunchTableData } from "./types";
import DayGroup from "./DayGroup";
import { formatMonthBR } from "../../utils/date";
import "./LauncheTable.css";


type LaunchTableProps = {
  data: LaunchTableData;
  sortField: LaunchSortField;
  onSortFieldChange: (field: LaunchSortField) => void;
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

export default function LaunchTable({
  data,
  sortField,
  onSortFieldChange,
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
}: Readonly<LaunchTableProps>) {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const allDaysCollapsed = data.days.length > 0 && data.days.every((day) => collapsedDays[day.date]);
  const hasSelection = selectedCount > 0;
  const selectionLabel = `${selectedCount} ${selectedCount === 1 ? "selecionado" : "selecionados"}`;

  function handleToggleAllDays() {
    setCollapsedDays(
      data.days.reduce<Record<string, boolean>>((accumulator, day) => {
        accumulator[day.date] = !allDaysCollapsed;
        return accumulator;
      }, {}),
    );
  }

  function handleToggleDay(dayDate: string) {
    setCollapsedDays((current) => ({
      ...current,
      [dayDate]: !current[dayDate],
    }));
  }

  return (
    <div className="launch-table">
      <div className="launch-table-header">
        <h2>{formatMonthBR(data.month)}</h2>
        <div className="opening-balance-group">
          <div className="launch-table-toolbar">
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
                <button
                  type="button"
                  className="secondary-inline-button"
                  onClick={onClearSelection}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="danger-inline-button"
                  onClick={onDeleteSelected}
                >
                  Excluir selecionados
                </button>
              </div>
            )}
          </div>

          <div className="opening-balance-row">
            <span className="opening-balance">
              Saldo inicial:{" "}
              {data.openingBalance.toLocaleString("pt-BR", {
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
          <button type="button" className="collapse-all-button" onClick={handleToggleAllDays}>
            {allDaysCollapsed ? "Expandir todos" : "Recolher todos"}
          </button>
        </div>
      </div>

      {data.days.map(day => (
        <DayGroup
          key={day.date}
          day={day}
          isCollapsed={!!collapsedDays[day.date]}
          onToggleCollapse={() => handleToggleDay(day.date)}
          selectedLaunchIds={selectedLaunchIds}
          onToggleLaunchSelection={onToggleLaunchSelection}
          onEdit={(row) => {
            onEdit(row);
          }}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}