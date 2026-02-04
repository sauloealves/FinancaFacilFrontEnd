import { useContext } from "react";
import { PeriodContext } from "./period.context";
import type { PeriodContextType } from "./period.types";

export function usePeriod(): PeriodContextType {
  const ctx = useContext(PeriodContext);

  if (!ctx) {
    throw new Error("usePeriod must be used inside PeriodProvider");
  }

  return ctx;
}
