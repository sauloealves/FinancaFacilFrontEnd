import { useState } from "react";
import type { LaunchRow, LaunchSortField, LaunchTableData, LaunchViewMode } from "./types";
import DayGroup from "./DayGroup";
import LaunchesViewControls from "./LaunchesViewControls";
import "./LauncheTable.css";

type LaunchTableProps = {
  data: LaunchTableData;
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

export default function LaunchTable({
  data,
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
}: Readonly<LaunchTableProps>) {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const allDaysCollapsed = data.days.length > 0 && data.days.every((day) => collapsedDays[day.date]);

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
      <LaunchesViewControls
        month={data.month}
        openingBalance={data.openingBalance}
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
        footerActions={
          <button type="button" className="collapse-all-button" onClick={handleToggleAllDays}>
            {allDaysCollapsed ? "Expandir todos" : "Recolher todos"}
          </button>
        }
      />

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