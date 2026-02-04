import type { LaunchRow, DayGroup, LaunchTableData } from "./types";

type NormalizeInput = {
  month: string;
  openingBalance: number;
  launches: LaunchRow[];
};

export function normalizeLaunches({
  month,
  openingBalance,
  launches,
}: NormalizeInput): LaunchTableData {
  // 1️⃣ Filtra apenas o mês
  const monthLaunches = launches.filter(l =>
    l.date.startsWith(month)
  );

  // 2️⃣ Ordena por data
  monthLaunches.sort((a, b) => a.date.localeCompare(b.date));

  // 3️⃣ Agrupa por dia
  const byDay = new Map<string, LaunchRow[]>();
  console.log(byDay);
  for (const launch of monthLaunches) {
    if (!byDay.has(launch.date)) {
      byDay.set(launch.date, []);
    }
    byDay.get(launch.date)!.push(launch);
  }

  // 4️⃣ Calcula saldo acumulado
  let runningBalance = openingBalance;
  const days: DayGroup[] = [];

  for (const [date, rows] of byDay.entries()) {
    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const row of rows) {
      if (row.type === "income") {
        incomeTotal += row.value;
      } else if (row.type === "expense") {
        expenseTotal += row.value;
      }
      // transfer não altera saldo global
    }

    runningBalance = runningBalance + incomeTotal - expenseTotal;

    days.push({
      date,
      rows,
      incomeTotal,
      expenseTotal,
      dayBalance: runningBalance,
    });
  }

  return {
    month,
    openingBalance,
    days,
  };
}
