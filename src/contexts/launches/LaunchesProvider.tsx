import { useMemo, useEffect, useState } from "react";
import { LaunchesContext } from "./LaunchesContext";
import { usePeriod } from "../usePeriodo";
import type { LaunchRow } from "../../features/launches/types";
import { getLaunches as fetchLaunches, type GetTransactionsFilter } from "../../services/launchService";
import { normalizeDateFromBackend } from "../../utils/date";
import { useAccounts } from "../accounts/useAccounts";
import { useCategories } from "../categories/useCategories";

export function LaunchesProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [launches, setLaunches] = useState<LaunchRow[]>([]);
  const { month } = usePeriod();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const getDateRangeFromMonth = (monthStr: string) => {
    const [year, monthNum] = monthStr.split("-");
    const startDate = `${year}-${monthNum}-01`;
    
    // Último dia do mês
    const nextMonth = new Date(Number(year), Number(monthNum), 1);
    nextMonth.setDate(0);
    const endDate = nextMonth.toISOString().split("T")[0];
    
    return { startDate, endDate };
  };

  /**
   * Enriquece uma referência (conta/categoria) se ela tiver apenas ID
   */
  const fillReference = <T extends { id: string; name?: string }>(
    ref: T | undefined,
    findFn: (id: string) => T | undefined
  ): T | undefined => {
    if (!ref?.id) return ref;
    if (ref.name) return ref;
    return findFn(ref.id) ?? ref;
  };

  /**
   * Enriquece um lançamento com informações de contas/categorias
   */
  const enrichLaunch = (launch: LaunchRow): LaunchRow => {
    const accountFinder = (id: string) => accounts.find(a => a.id === id);
    const categoryFinder = (id: string) => categories.find(c => c.id === id);

    return {
      ...launch,
      date: normalizeDateFromBackend(launch.date),
      account: fillReference(launch.account, accountFinder),
      category: fillReference(launch.category, categoryFinder),
      fromAccount: fillReference(launch.fromAccount, accountFinder),
      toAccount: fillReference(launch.toAccount, accountFinder),
    };
  };

  /**
   * Normaliza e enriquece os dados que vêm do backend
   */
  const normalizeLaunchesData = (data: LaunchRow[]): LaunchRow[] => {
    return data.map(enrichLaunch);
  };

  const reloadLaunches = async () => {
    try {
      const { startDate, endDate } = getDateRangeFromMonth(month);
      const filter: GetTransactionsFilter = { startDate, endDate };
      const data = await fetchLaunches(filter);
      setLaunches(normalizeLaunchesData(data || []));
    } catch (err) {
      console.error(err);
      setLaunches([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadLaunches = async () => {
      try {
        const { startDate, endDate } = getDateRangeFromMonth(month);
        const filter: GetTransactionsFilter = { startDate, endDate };
        const data = await fetchLaunches(filter);
        if (mounted) setLaunches(normalizeLaunchesData(data || []));
      } catch (err) {
        console.error(err);
        if (mounted) setLaunches([]);
      }
    };

    loadLaunches();

    return () => {
      mounted = false;
    };
  }, [month, accounts, categories]);

  function updateLaunch(updated: LaunchRow) {
    setLaunches(prev =>
      prev.map(l =>
        l.id === updated.id ? updated : l
      )
    );
  }

  const value = useMemo(
    () => ({ launches, updateLaunch, reloadLaunches }),
    [launches]
  );

  return (
    <LaunchesContext.Provider value={value}>
      {children}
    </LaunchesContext.Provider>
  );
}
