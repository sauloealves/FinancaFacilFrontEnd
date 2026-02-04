import { useState } from "react";
import LaunchTable from "../features/launches/LauncheTable";
import { normalizeLaunches } from "../features/launches/normalizeLaunches";
import type { LaunchRow } from "../features/launches/types";
import { formatMonthBR } from "../utils/date";
import { usePeriod } from "../contexts/usePeriodo";


/**
 * Página de Lançamentos
 * Caminho: /launches
 */
export default function LaunchesPage() {
  const { month } = usePeriod();

  const openingBalanceByMonth: Record<string, number> = {
    "2026-01": 3000,
    "2026-02": 3250,
  };
  // 🔧 MOCK (temporário)  

const launches: LaunchRow[] = [
  {
    id: "1",
    date: "2026-02-01",
    description: "Salário",
    type: "income",
    value: 5000,
    account: { id: "1", name: "Conta Corrente" },
    category: { id: "1", name: "Salário" },
  },
  {
    id: "2",
    date: "2026-02-05",
    description: "Mercado",
    type: "expense",
    value: 120,
    account: { id: "2", name: "Cartão" },
    category: { id: "2", name: "Alimentação" },
  },
  {
    id: "3",
    date: "2026-02-02",
    description: "Netflix",
    type: "expense",
    value: 39.9,
    account: { id: "2", name: "Cartão" },
    category: { id: "3", name: "Lazer" },
  },
  {
    id: "4",
    date: "2026-02-02",
    description: "Transferência",
    type: "transfer",
    value: 300,
    fromAccount: { id: "1", name: "Conta Corrente" },
    toAccount: { id: "3", name: "Poupança" },
  },
];


  const tableData = normalizeLaunches({
    month: month,
    openingBalance: openingBalanceByMonth[month] ?? 0,
    launches,
  });

  return (
    <div className="launches-page">
      <LaunchTable data={tableData} />
    </div>
  );
}
