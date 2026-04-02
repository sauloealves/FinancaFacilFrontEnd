import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "../../components/ui";
import type { BudgetPlannerRow, UpdateBudgetItemPayload } from "./types";
import { BUDGET_MONTHS, distributeAnnualValue, formatCurrency } from "./utils";
import { formatBRLInput, maskBRLInput, parseBRL } from "../../utils/currency";

type BudgetPlannerGridProps = {
  rows: BudgetPlannerRow[];
  savingKeys: Set<string>;
  onUpdateCell: (payload: UpdateBudgetItemPayload) => Promise<void>;
  onBulkUpdate: (payloads: UpdateBudgetItemPayload[]) => Promise<void>;
};

type ActiveCell = {
  rowIndex: number;
  columnIndex: number;
};

const ROW_HEIGHT = 88;
const VIEWPORT_HEIGHT = 540;
const OVERSCAN = 6;

function buildCellDomKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

function buildSavingKey(categoryId: string, monthKey: string): string {
  return `${categoryId}:${monthKey}`;
}

type PlannerRowProps = {
  row: BudgetPlannerRow;
  rowIndex: number;
  top: number;
  activeCell: ActiveCell | null;
  editingCell: ActiveCell | null;
  editValue: string;
  savingKeys: Set<string>;
  registerButtonRef: (key: string, element: HTMLButtonElement | null) => void;
  onSelectCell: (rowIndex: number, columnIndex: number) => void;
  onStartEdit: (rowIndex: number, columnIndex: number) => void;
  onEditInputChange: (value: string) => void;
  onEditInputBlur: () => void;
  onEditInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCellKeyDown: (event: KeyboardEvent<HTMLButtonElement>, rowIndex: number, columnIndex: number) => void;
};

const PlannerRow = memo(function PlannerRow({
  row,
  rowIndex,
  top,
  activeCell,
  editingCell,
  editValue,
  savingKeys,
  registerButtonRef,
  onSelectCell,
  onStartEdit,
  onEditInputChange,
  onEditInputBlur,
  onEditInputKeyDown,
  onCellKeyDown,
}: Readonly<PlannerRowProps>) {
  return (
    <div className="budget-grid-row" style={{ top }}>
      <div className="budget-grid-category budget-grid-sticky">
        <div className="budget-grid-category-main">
          <strong>{row.categoryName}</strong>
          <span>{formatCurrency(row.annualPlanned)} planejado no ano</span>
        </div>
      </div>

      {row.months.map((month, columnIndex) => {
        const isActive = activeCell?.rowIndex === rowIndex && activeCell?.columnIndex === columnIndex;
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === columnIndex;
        const savingKey = buildSavingKey(row.categoryId, month.monthKey);

        return (
          <div
            key={month.monthKey}
            className={`budget-grid-cell budget-grid-cell-${month.status} ${isActive ? "is-active" : ""} ${savingKeys.has(savingKey) ? "is-saving" : ""}`}
          >
            {isEditing ? (
              <input
                className="budget-grid-input"
                value={editValue}
                autoFocus
                onChange={(event) => onEditInputChange(maskBRLInput(event.target.value))}
                onBlur={onEditInputBlur}
                onKeyDown={onEditInputKeyDown}
              />
            ) : (
              <button
                ref={(element) => registerButtonRef(buildCellDomKey(rowIndex, columnIndex), element)}
                type="button"
                className="budget-grid-cell-button"
                onFocus={() => onSelectCell(rowIndex, columnIndex)}
                onClick={() => onSelectCell(rowIndex, columnIndex)}
                onDoubleClick={() => onStartEdit(rowIndex, columnIndex)}
                onKeyDown={(event) => onCellKeyDown(event, rowIndex, columnIndex)}
              >
                <span className="budget-grid-planned">{formatCurrency(month.planned)}</span>
                <span className="budget-grid-realized">Realizado {formatCurrency(month.realized)}</span>
              </button>
            )}
          </div>
        );
      })}

      <div className="budget-grid-total">
        <strong>{formatCurrency(row.annualPlanned)}</strong>
        <span>{formatCurrency(row.annualRealized)}</span>
      </div>
    </div>
  );
});

export default function BudgetPlannerGrid({
  rows,
  savingKeys,
  onUpdateCell,
  onBulkUpdate,
}: Readonly<BudgetPlannerGridProps>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(rows.length > 0 ? { rowIndex: 0, columnIndex: 0 } : null);
  const [editingCell, setEditingCell] = useState<ActiveCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [annualValue, setAnnualValue] = useState("");
  const pendingMoveRef = useRef<"right" | "down" | null>(null);
  const cellButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (rows.length === 0) {
      setActiveCell(null);
      setEditingCell(null);
      return;
    }

    setActiveCell((current) => current ?? { rowIndex: 0, columnIndex: 0 });
  }, [rows.length]);

  useEffect(() => {
    if (!activeCell) {
      setAnnualValue("");
      return;
    }

    const row = rows[activeCell.rowIndex];
    if (!row) {
      return;
    }

    setAnnualValue(formatBRLInput(row.annualPlanned));
  }, [activeCell, rows]);

  const { startIndex, endIndex } = useMemo(() => {
    const nextStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const nextEnd = Math.min(rows.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN);

    return {
      startIndex: nextStart,
      endIndex: nextEnd,
    };
  }, [rows.length, scrollTop]);

  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex).map((row, index) => ({ row, rowIndex: startIndex + index })),
    [endIndex, rows, startIndex],
  );

  const activeRow = activeCell ? rows[activeCell.rowIndex] : null;
  const activeMonth = activeCell && activeRow ? activeRow.months[activeCell.columnIndex] : null;

  function registerButtonRef(key: string, element: HTMLButtonElement | null) {
    cellButtonRefs.current[key] = element;
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    globalThis.requestAnimationFrame(() => {
      cellButtonRefs.current[buildCellDomKey(rowIndex, columnIndex)]?.focus();
    });
  }

  function selectCell(rowIndex: number, columnIndex: number) {
    setActiveCell({ rowIndex, columnIndex });
  }

  function moveSelection(rowIndex: number, columnIndex: number) {
    const clampedRow = Math.max(0, Math.min(rows.length - 1, rowIndex));
    const clampedColumn = Math.max(0, Math.min(11, columnIndex));
    setActiveCell({ rowIndex: clampedRow, columnIndex: clampedColumn });
    focusCell(clampedRow, clampedColumn);
  }

  function startEdit(rowIndex: number, columnIndex: number) {
    const nextCell = rows[rowIndex]?.months[columnIndex];
    if (!nextCell) {
      return;
    }

    setActiveCell({ rowIndex, columnIndex });
    setEditingCell({ rowIndex, columnIndex });
    setEditValue(formatBRLInput(nextCell.planned));
  }

  async function commitEditing() {
    if (!editingCell) {
      return;
    }

    const row = rows[editingCell.rowIndex];
    const month = row?.months[editingCell.columnIndex];
    const moveDirection = pendingMoveRef.current;
    pendingMoveRef.current = null;

    if (!row || !month) {
      setEditingCell(null);
      return;
    }

    const parsedValue = editValue.trim() ? parseBRL(editValue) : 0;
    setEditingCell(null);

    if (parsedValue !== month.planned) {
      await onUpdateCell({
        budgetMonthId: month.budgetMonthId,
        categoryId: row.categoryId,
        monthKey: month.monthKey,
        planned: parsedValue,
        itemId: month.itemId,
      });
    }

    if (moveDirection === "right") {
      moveSelection(editingCell.rowIndex, Math.min(editingCell.columnIndex + 1, 11));
      return;
    }

    if (moveDirection === "down") {
      moveSelection(Math.min(editingCell.rowIndex + 1, rows.length - 1), editingCell.columnIndex);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      pendingMoveRef.current = null;
      setEditingCell(null);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      pendingMoveRef.current = "right";
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      pendingMoveRef.current = "down";
      event.currentTarget.blur();
    }
  }

  function handleCellKeyDown(event: KeyboardEvent<HTMLButtonElement>, rowIndex: number, columnIndex: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      startEdit(rowIndex, columnIndex);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(rowIndex, columnIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(rowIndex, columnIndex - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(rowIndex + 1, columnIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(rowIndex - 1, columnIndex);
    }
  }

  async function applyToFullYear() {
    if (!activeRow || !activeMonth) {
      return;
    }

    await onBulkUpdate(
      activeRow.months.map((month) => ({
        budgetMonthId: month.budgetMonthId,
        categoryId: activeRow.categoryId,
        monthKey: month.monthKey,
        planned: activeMonth.planned,
        itemId: month.itemId,
      })),
    );
  }

  async function copyPreviousMonth() {
    if (!activeRow || !activeMonth || !activeCell || activeCell.columnIndex === 0) {
      return;
    }

    const previousMonth = activeRow.months[activeCell.columnIndex - 1];

    await onUpdateCell({
      budgetMonthId: activeMonth.budgetMonthId,
      categoryId: activeRow.categoryId,
      monthKey: activeMonth.monthKey,
      planned: previousMonth.planned,
      itemId: activeMonth.itemId,
    });
  }

  async function distributeAnnualTarget() {
    if (!activeRow) {
      return;
    }

    const total = annualValue.trim() ? parseBRL(annualValue) : 0;
    const monthlyValues = distributeAnnualValue(total, activeRow.months.length);

    await onBulkUpdate(
      activeRow.months.map((month, index) => ({
        budgetMonthId: month.budgetMonthId,
        categoryId: activeRow.categoryId,
        monthKey: month.monthKey,
        planned: monthlyValues[index],
        itemId: month.itemId,
      })),
    );
  }

  return (
    <div className="budget-planner-shell">
      <div className="budget-planner-toolbar">
        <div className="budget-planner-toolbar-copy">
          <strong>{activeRow?.categoryName ?? "Selecione uma categoria"}</strong>
          <span>
            {activeMonth ? `Célula ativa: ${BUDGET_MONTHS[activeCell?.columnIndex ?? 0]} (${formatCurrency(activeMonth.planned)})` : "Selecione uma célula para editar"}
          </span>
        </div>

        <div className="budget-planner-toolbar-actions">
          <Button variant="secondary" onClick={() => void applyToFullYear()} disabled={!activeMonth}>
            Copiar valor para todos os meses
          </Button>
          <Button variant="secondary" onClick={() => void copyPreviousMonth()} disabled={!activeCell || activeCell.columnIndex === 0}>
            Copiar mês anterior
          </Button>
          <label className="budget-distribute-field">
            <span>Valor anual</span>
            <input value={annualValue} onChange={(event) => setAnnualValue(maskBRLInput(event.target.value))} />
          </label>
          <Button onClick={() => void distributeAnnualTarget()} disabled={!activeRow}>
            Distribuir valor anual
          </Button>
        </div>
      </div>

      <div className="budget-grid-wrapper" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div className="budget-grid budget-grid-header">
          <div className="budget-grid-category budget-grid-sticky">
            <strong>Categoria</strong>
            <span>Planejamento anual</span>
          </div>
          {BUDGET_MONTHS.map((month) => (
            <div key={month} className="budget-grid-month-header">{month}</div>
          ))}
          <div className="budget-grid-total budget-grid-total-header">Total ano</div>
        </div>

        <div className="budget-grid-viewport" style={{ height: rows.length * ROW_HEIGHT }}>
          {visibleRows.map(({ row, rowIndex }) => (
            <PlannerRow
              key={row.categoryId}
              row={row}
              rowIndex={rowIndex}
              top={rowIndex * ROW_HEIGHT}
              activeCell={activeCell}
              editingCell={editingCell}
              editValue={editValue}
              savingKeys={savingKeys}
              registerButtonRef={registerButtonRef}
              onSelectCell={selectCell}
              onStartEdit={startEdit}
              onEditInputChange={setEditValue}
              onEditInputBlur={() => {
                void commitEditing();
              }}
              onEditInputKeyDown={handleInputKeyDown}
              onCellKeyDown={handleCellKeyDown}
            />
          ))}
        </div>
      </div>
    </div>
  );
}