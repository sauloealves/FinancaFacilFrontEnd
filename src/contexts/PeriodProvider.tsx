import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PeriodContext } from "./period.context";
import type { PeriodMode } from "./period.types";

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function PeriodProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [period, setPeriodState] = useState((): { month: string; mode: PeriodMode } => ({
    month: getCurrentMonthKey(),
    mode: "monthly",
  }));

  const setMonth = useCallback((month: string) => {
    setPeriodState({ month, mode: "monthly" });
  }, []);

  const setYear = useCallback((year: number) => {
    setPeriodState((current) => ({
      month: `${year}-${current.month.slice(5, 7)}`,
      mode: "yearly",
    }));
  }, []);

  const setPeriodMode = useCallback((mode: PeriodMode) => {
    setPeriodState((current) => ({ ...current, mode }));
  }, []);

  const setPeriod = useCallback((nextPeriod: { mode: PeriodMode; month: string }) => {
    setPeriodState(nextPeriod);
  }, []);

  const year = Number(period.month.slice(0, 4));

  const contextValue = useMemo(
    () => ({
      month: period.month,
      year,
      mode: period.mode,
      setMonth,
      setYear,
      setPeriodMode,
      setPeriod,
    }),
    [period.month, period.mode, setMonth, setYear, setPeriodMode, setPeriod, year],
  );

  return (
    <PeriodContext.Provider value={contextValue}>
      {children}
    </PeriodContext.Provider>
  );
}
