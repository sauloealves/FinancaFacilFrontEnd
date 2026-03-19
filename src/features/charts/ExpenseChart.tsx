import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LaunchRow } from "../launches/types";
import { isTransactionType } from "../../utils/sortUtils";

type ExpenseChartProps = {
  launches: LaunchRow[];
  month: string;
  maxItems?: number;
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

export default function ExpenseChart({ launches, month, maxItems = Number.POSITIVE_INFINITY }: Readonly<ExpenseChartProps>) {
  // Filtra apenas despesas do mês selecionado
  const monthExpenses = launches.filter((launch) => {
    const launchMonth = launch.date.substring(0, 7);
    return (
      launchMonth === month &&
      isTransactionType(launch.type, "expense") &&
      !isTransactionType(launch.type, "transfer")
    );
  });

  // Agrupa despesas por categoria
  const expensesByCategory = monthExpenses.reduce(
    (acc, expense) => {
      const categoryName = expense.category?.name ?? "Sem categoria";
      const existing = acc.find((item) => item.name === categoryName);

      if (existing) {
        existing.value += Math.abs(expense.value);
      } else {
        acc.push({
          name: categoryName,
          value: Math.abs(expense.value),
          fill: CATEGORY_COLORS[acc.length % CATEGORY_COLORS.length],
        });
      }

      return acc;
    },
    [] as Array<{ name: string; value: number; fill: string }>
  );

  // Ordena por valor descendente
  expensesByCategory.sort((a, b) => b.value - a.value);

  const limitedExpensesByCategory = expensesByCategory.slice(0, maxItems);

  if (limitedExpensesByCategory.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        Nenhuma despesa registrada neste mês
      </div>
    );
  }

  const chartHeight = Math.max(300, limitedExpensesByCategory.length * 56);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={limitedExpensesByCategory}
        layout="vertical"
        margin={{ top: 12, right: 24, left: 8, bottom: 12 }}
        barCategoryGap={14}
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
        <Tooltip
          formatter={(value) =>
            Number(value ?? 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          }
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
