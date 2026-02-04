import { createContext } from "react";
import type { PeriodContextType } from "./period.types";

export const PeriodContext =
  createContext<PeriodContextType | null>(null);
