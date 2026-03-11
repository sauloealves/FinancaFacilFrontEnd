import { useMemo, useState, type ReactNode } from "react";
import { PeriodContext } from "./period.context";

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function PeriodProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [month, setMonth] = useState(getCurrentMonthKey);
  const contextValue = useMemo(() => ({ month, setMonth }), [month]);

  return (
    <PeriodContext.Provider value={contextValue}>
      {children}
    </PeriodContext.Provider>
  );
}
