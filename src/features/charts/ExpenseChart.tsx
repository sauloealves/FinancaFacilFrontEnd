import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { LaunchRow } from "../launches/types";
import { isTransactionType } from "../../utils/sortUtils";
import { formatDateBR } from "../../utils/date";
import "./ExpenseChart.css";

type ExpenseChartProps = {
  launches: LaunchRow[];
  month: string;
  maxItems?: number;
  onLaunchClick?: (launch: LaunchRow) => void;
};

const CATEGORY_COLORS = [
  "#0f5e94",
  "#0ba99c",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#64748b",
  "#22c55e",
];

type ExpenseCategoryDatum = {
  name: string;
  value: number;
  fill: string;
  rows: LaunchRow[];
};

function formatCurrency(value: number) {
  return Math.abs(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getAccountName(launch: LaunchRow) {
  return launch.account?.name ?? launch.fromAccount?.name ?? "Sem conta";
}

function ColoredExpenseBarShape(props: any) {
  return (
    <Rectangle
      {...props}
      fill={props.payload.fill}
      radius={[0, 8, 8, 0]}
    />
  );
}

const panelStyles = {
  shell: {
    position: "relative",
  } satisfies React.CSSProperties,
  anchor: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 6,
  } satisfies React.CSSProperties,
  container: {
    width: "min(520px, calc(100vw - 32px))",
    background: "rgba(255, 255, 255, 0.98)",
    border: "1px solid #dbe3ea",
    borderRadius: 16,
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.16)",
    overflow: "hidden",
  } satisfies React.CSSProperties,
  title: {
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#0f172a",
    background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
    borderBottom: "1px solid #dbe3ea",
  } satisfies React.CSSProperties,
  wrapper: {
    maxHeight: 280,
    overflow: "auto",
  } satisfies React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.82rem",
  } satisfies React.CSSProperties,
  headCell: {
    position: "sticky",
    top: 0,
    background: "#f8fafc",
    color: "#475569",
    fontSize: "0.74rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "10px 12px",
    textAlign: "left",
    borderBottom: "1px solid #eef2f7",
    zIndex: 1,
  } satisfies React.CSSProperties,
  bodyCell: {
    padding: "10px 12px",
    textAlign: "left",
    borderBottom: "1px solid #eef2f7",
    color: "#0f172a",
    verticalAlign: "top",
  } satisfies React.CSSProperties,
  footerCell: {
    padding: "10px 12px",
    background: "#f8fafc",
    fontWeight: 700,
    color: "#0f172a",
    borderTop: "1px solid #eef2f7",
  } satisfies React.CSSProperties,
  value: {
    textAlign: "right",
    whiteSpace: "nowrap",
  } satisfies React.CSSProperties,
  rowButton: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    font: "inherit",
    textAlign: "inherit",
    color: "inherit",
    cursor: "pointer",
  } satisfies React.CSSProperties,
};

function ExpenseDetailsPanel({
  categoryData,
  onLaunchClick,
  panelRef,
}: Readonly<{
  categoryData: ExpenseCategoryDatum;
  onLaunchClick?: (launch: LaunchRow) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <div ref={panelRef} className="expense-chart-tooltip" style={panelStyles.container}>
      <div className="expense-chart-tooltip-title" style={panelStyles.title}>{categoryData.name}</div>

      <div className="expense-chart-tooltip-table-wrapper" style={panelStyles.wrapper}>
        <table className="expense-chart-tooltip-table" style={panelStyles.table}>
          <thead>
            <tr>
              <th style={panelStyles.headCell}>Data</th>
              <th style={panelStyles.headCell}>Descricao</th>
              <th style={panelStyles.headCell}>Conta</th>
              <th style={{ ...panelStyles.headCell, ...panelStyles.value }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.rows.map((launch) => (
              <tr key={launch.id}>
                <td style={panelStyles.bodyCell}>
                  <button
                    type="button"
                    style={panelStyles.rowButton}
                    onClick={() => onLaunchClick?.(launch)}
                    title={onLaunchClick ? "Abrir lancamento para edicao" : undefined}
                  >
                    {formatDateBR(launch.date)}
                  </button>
                </td>
                <td style={panelStyles.bodyCell}>
                  <button
                    type="button"
                    style={panelStyles.rowButton}
                    onClick={() => onLaunchClick?.(launch)}
                    title={onLaunchClick ? "Abrir lancamento para edicao" : undefined}
                  >
                    {launch.description}
                  </button>
                </td>
                <td style={panelStyles.bodyCell}>
                  <button
                    type="button"
                    style={panelStyles.rowButton}
                    onClick={() => onLaunchClick?.(launch)}
                    title={onLaunchClick ? "Abrir lancamento para edicao" : undefined}
                  >
                    {getAccountName(launch)}
                  </button>
                </td>
                <td style={{ ...panelStyles.bodyCell, ...panelStyles.value }}>
                  <button
                    type="button"
                    style={{ ...panelStyles.rowButton, textAlign: "right" }}
                    onClick={() => onLaunchClick?.(launch)}
                    title={onLaunchClick ? "Abrir lancamento para edicao" : undefined}
                  >
                    {formatCurrency(launch.value)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={panelStyles.footerCell}>Total</td>
              <td style={{ ...panelStyles.footerCell, ...panelStyles.value }}>{formatCurrency(categoryData.value)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function ExpenseChart({
  launches,
  month,
  maxItems = Number.POSITIVE_INFINITY,
  onLaunchClick,
}: Readonly<ExpenseChartProps>) {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategoryDatum | null>(null);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const [panelTop, setPanelTop] = useState(12);
  const clearActiveTimeoutRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (clearActiveTimeoutRef.current !== null) {
      globalThis.clearTimeout(clearActiveTimeoutRef.current);
      clearActiveTimeoutRef.current = null;
    }
  }, []);

  const scheduleClearActive = useCallback(() => {
    clearHideTimeout();
    clearActiveTimeoutRef.current = globalThis.setTimeout(() => {
      setActiveCategory(null);
      clearActiveTimeoutRef.current = null;
    }, 180);
  }, [clearHideTimeout]);

  const limitedExpensesByCategory = useMemo(() => {
    const monthExpenses = launches.filter((launch) => {
      const launchMonth = launch.date.substring(0, 7);
      return (
        launchMonth === month &&
        isTransactionType(launch.type, "expense") &&
        !isTransactionType(launch.type, "transfer")
      );
    });

    const expensesByCategory = monthExpenses.reduce(
      (acc, expense) => {
        const categoryName = expense.category?.name ?? "Sem categoria";
        const existing = acc.find((item) => item.name === categoryName);

        if (existing) {
          existing.value += Math.abs(expense.value);
          existing.rows.push(expense);
        } else {
          acc.push({
            name: categoryName,
            value: Math.abs(expense.value),
            fill: CATEGORY_COLORS[acc.length % CATEGORY_COLORS.length],
            rows: [expense],
          });
        }

        return acc;
      },
      [] as ExpenseCategoryDatum[]
    );

    expensesByCategory.sort((a, b) => b.value - a.value);
    expensesByCategory.forEach((category) => {
      category.rows.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
    });

    return expensesByCategory.slice(0, maxItems);
  }, [launches, month, maxItems]);

  const chartHeight = Math.max(300, limitedExpensesByCategory.length * 56);

  const handleChartMouseMove = useCallback((state: any) => {
    const activeIndex = Number(state?.activeTooltipIndex ?? state?.activeIndex);
    const coordinateY = Number(state?.activeCoordinate?.y);

    if (!Number.isInteger(activeIndex) || activeIndex < 0) {
      return;
    }

    const nextCategory = limitedExpensesByCategory[activeIndex];

    if (!nextCategory) {
      return;
    }

    clearHideTimeout();
    setActiveCategory(nextCategory);

    if (Number.isFinite(coordinateY)) {
      const shellHeight = shellRef.current?.getBoundingClientRect().height ?? chartHeight;
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 320;
      const nextTop = Math.min(
        Math.max(coordinateY - panelHeight / 2, 8),
        Math.max(shellHeight - panelHeight - 8, 8)
      );
      setPanelTop(nextTop);
    }
  }, [chartHeight, clearHideTimeout, limitedExpensesByCategory]);

  const handleChartMouseLeave = useCallback(() => {
    if (!isPanelHovered) {
      scheduleClearActive();
    }
  }, [isPanelHovered, scheduleClearActive]);

  useEffect(() => {
    const panelElement = panelRef.current;

    if (!panelElement) {
      return;
    }

    function handlePanelMouseEnter() {
      clearHideTimeout();
      setIsPanelHovered(true);
    }

    function handlePanelMouseLeave() {
      setIsPanelHovered(false);
      scheduleClearActive();
    }

    panelElement.addEventListener("mouseenter", handlePanelMouseEnter);
    panelElement.addEventListener("mouseleave", handlePanelMouseLeave);

    return () => {
      panelElement.removeEventListener("mouseenter", handlePanelMouseEnter);
      panelElement.removeEventListener("mouseleave", handlePanelMouseLeave);
    };
  }, [activeCategory, clearHideTimeout, scheduleClearActive]);

  if (limitedExpensesByCategory.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        Nenhuma despesa registrada neste mês
      </div>
    );
  }

  return (
    <div className="expense-chart-shell" style={panelStyles.shell} ref={shellRef}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={limitedExpensesByCategory}
          layout="vertical"
          margin={{ top: 12, right: 24, left: 8, bottom: 12 }}
          barCategoryGap={14}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              Number(value ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              })
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={120}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            activeBar={{ fill: "rgba(15, 94, 148, 0.9)" }}
            shape={<ColoredExpenseBarShape />}
          />
        </BarChart>
      </ResponsiveContainer>

      {activeCategory && (
        <div
          className="expense-chart-tooltip-anchor"
          style={{
            ...panelStyles.anchor,
            top: panelTop,
          }}
        >
          <ExpenseDetailsPanel
            categoryData={activeCategory}
            onLaunchClick={onLaunchClick}
            panelRef={panelRef}
          />
        </div>
      )}
    </div>
  );
}
