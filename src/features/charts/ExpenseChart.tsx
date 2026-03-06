import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { LaunchRow } from "../launches/types";
import { isTransactionType } from "../../utils/sortUtils";

type ExpenseChartProps = {
  launches: LaunchRow[];
  month: string;
};

const COLORS = [
  "#DC3545", // Vermelho
  "#FF9800", // Laranja
  "#FFC107", // Amarelo
  "#28A745", // Verde
  "#17A2B8", // Azul claro
  "#007BFF", // Azul
  "#6F42C1", // Roxo
  "#E83E8C", // Rosa
  "#6C757D", // Cinza
  "#FD7E14", // Laranja escuro
];

export default function ExpenseChart({ launches, month }: ExpenseChartProps) {
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
        });
      }

      return acc;
    },
    [] as Array<{ name: string; value: number }>
  );

  // Ordena por valor descendente
  expensesByCategory.sort((a, b) => b.value - a.value);

  if (expensesByCategory.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        Nenhuma despesa registrada neste mês
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={expensesByCategory} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{ value: "R$", angle: -90, position: "insideLeft" }}
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
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {expensesByCategory.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
