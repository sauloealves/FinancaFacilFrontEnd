export type PeriodMode = "monthly" | "yearly";

export type PeriodContextType = {
  month: string;
  year: number;
  mode: PeriodMode;
  setMonth: (month: string) => void;
  setYear: (year: number) => void;
  setPeriodMode: (mode: PeriodMode) => void;
  setPeriod: (period: { mode: PeriodMode; month: string }) => void;
};
