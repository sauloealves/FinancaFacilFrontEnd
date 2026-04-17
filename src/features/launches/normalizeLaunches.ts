import type { LaunchRow, DayGroup, LaunchTableData } from "./types";
import { isTransactionType } from "../../utils/sortUtils";

type NormalizeInput = {
  month: string;
  mode?: "monthly" | "yearly";
  openingBalance: number;
  launches: LaunchRow[];
  selectedAccounts?: string[];
};

export function calculateLaunchBalanceImpact(
  row: LaunchRow,
  selectedAccounts: string[],
): number {
  if (isTransactionType(row.type, "income")) {
    return row.value;
  }

  if (isTransactionType(row.type, "expense")) {
    return -row.value;
  }

  if (selectedAccounts.length === 0) {
    return 0;
  }

  let impact = 0;

  if (row.fromAccount?.id && selectedAccounts.includes(row.fromAccount.id)) {
    impact -= row.value;
  }

  if (row.toAccount?.id && selectedAccounts.includes(row.toAccount.id)) {
    impact += row.value;
  }

  return impact;
}

export function normalizeLaunches({
  month,
  mode = "monthly",
  openingBalance,
  launches,
  selectedAccounts = [],
}: NormalizeInput): LaunchTableData {
  const periodPrefix = mode === "yearly" ? `${month.slice(0, 4)}-` : month;
  const monthLaunches = launches.filter(l =>
    l.date.startsWith(periodPrefix)
  );

  monthLaunches.sort((a, b) => a.date.localeCompare(b.date));

  const byDay = new Map<string, LaunchRow[]>();
  for (const launch of monthLaunches) {
    if (!byDay.has(launch.date)) {
      byDay.set(launch.date, []);
    }
    byDay.get(launch.date)!.push(launch);
  }

  let runningBalance = openingBalance;
  const days: DayGroup[] = [];

  for (const [date, rows] of byDay.entries()) {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let dayBalanceImpact = 0;

    for (const row of rows) {
      if (isTransactionType(row.type, "income")) {
        incomeTotal += row.value;
      } else if (isTransactionType(row.type, "expense")) {
        expenseTotal += row.value;
      }

      dayBalanceImpact += calculateLaunchBalanceImpact(row, selectedAccounts);
    }

    runningBalance += dayBalanceImpact;

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
