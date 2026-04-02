import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../../components/ui";
import type { BudgetSummary } from "./types";
import { formatCurrency } from "./utils";

type BudgetDashboardChartsProps = {
  summary: BudgetSummary;
  onSelectMonth?: (monthKey: string) => void;
};

const PIE_COLORS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#059669",
  "#475569",
];

export default function BudgetDashboardCharts({ summary, onSelectMonth }: Readonly<BudgetDashboardChartsProps>) {
  function formatTooltipValue(value: number | string | undefined) {
    return formatCurrency(typeof value === "number" ? value : Number(value ?? 0));
  }

  const pieData = useMemo(() => {
    const topItems = summary.categoryDistribution.slice(0, 5);
    const remaining = summary.categoryDistribution.slice(5);
    const remainingValue = remaining.reduce((acc, item) => acc + item.realized, 0);

    if (remainingValue <= 0) {
      return topItems;
    }

    return [
      ...topItems,
      {
        categoryId: "others",
        categoryName: "Outras categorias",
        planned: remaining.reduce((acc, item) => acc + item.planned, 0),
        realized: remainingValue,
        status: "ok",
      },
    ];
  }, [summary.categoryDistribution]);

  return (
    <div className="budget-dashboard-grid">
      <Card title="Planejado vs realizado por mês">
        <div className="budget-chart-shell">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={summary.monthlyComparison} barGap={8}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Bar
                name="Planejado"
                dataKey="planned"
                fill="#2563eb"
                radius={[10, 10, 0, 0]}
                onClick={(_, index) => {
                  const month = summary.monthlyComparison[index];
                  if (month?.monthKey) {
                    onSelectMonth?.(month.monthKey);
                  }
                }}
              />
              <Bar
                name="Realizado"
                dataKey="realized"
                fill="#f97316"
                radius={[10, 10, 0, 0]}
                onClick={(_, index) => {
                  const month = summary.monthlyComparison[index];
                  if (month?.monthKey) {
                    onSelectMonth?.(month.monthKey);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Distribuição por categoria">
        <div className="budget-chart-shell budget-chart-shell-pie">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="realized"
                nameKey="categoryName"
                innerRadius={68}
                outerRadius={108}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.categoryId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          </ResponsiveContainer>

          <div className="budget-pie-legend">
            {pieData.map((entry, index) => (
              <div key={entry.categoryId} className="budget-pie-legend-item">
                <span
                  className="budget-pie-legend-swatch"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="budget-pie-legend-label">{entry.categoryName}</span>
                <strong>{formatCurrency(entry.realized)}</strong>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}