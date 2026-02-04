import { useState } from "react";
import { PeriodContext } from "./period.context";

export function PeriodProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [month, setMonth] = useState("2026-02");

  return (
    <PeriodContext.Provider value={{ month, setMonth }}>
      {children}
    </PeriodContext.Provider>
  );
}
