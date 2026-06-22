import { useMemo, useEffect, useState } from "react";
import { LaunchesContext } from "./LaunchesContext";
import { usePeriod } from "../usePeriodo";
import type {
  FailedTransactionRow,
  LaunchRow,
} from "../../features/launches/types";
import {
  getFailedTransactions as fetchFailedTransactions,
  getLaunches as fetchLaunches,
  type GetTransactionsFilter,
} from "../../services/launchService";
import { normalizeDateFromBackend } from "../../utils/date";
import { useAccounts } from "../accounts/useAccounts";
import { useCategories } from "../categories/useCategories";

export function LaunchesProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [failedTransactions, setFailedTransactions] = useState<FailedTransactionRow[]>([]);
  const [launches, setLaunches] = useState<LaunchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { month, mode, year } = usePeriod();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const getDateRangeFromPeriod = (monthStr: string) => {
    if (mode === "yearly") {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }

    const [periodYear, monthNum] = monthStr.split("-");
    const startDate = `${periodYear}-${monthNum}-01`;
    
    // Último dia do mês
    const nextMonth = new Date(Number(periodYear), Number(monthNum), 1);
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

  const enrichFailedTransaction = (
    failedTransaction: FailedTransactionRow,
  ): FailedTransactionRow => {
    const accountFinder = (id: string) => accounts.find((account) => account.id === id);
    const categoryFinder = (id: string) => categories.find((category) => category.id === id);

    return {
      ...failedTransaction,
      account: fillReference(failedTransaction.account, accountFinder),
      category: fillReference(failedTransaction.category, categoryFinder),
    };
  };

  const normalizeFailedTransactionsData = (
    data: FailedTransactionRow[],
  ): FailedTransactionRow[] => {
    return data.map(enrichFailedTransaction);
  };

  const reloadLaunches = async () => {
    try {
      const { startDate, endDate } = getDateRangeFromPeriod(month);
      const filter: GetTransactionsFilter = { startDate, endDate };
      const data = await fetchLaunches(filter);
      setLaunches(normalizeLaunchesData(data || []));
    } catch (err) {
      console.error(err);
      setLaunches([]);
    }
  };

  const reloadFailedTransactions = async () => {
    try {
      const data = await fetchFailedTransactions();
      setFailedTransactions(normalizeFailedTransactionsData(data || []));
    } catch (err) {
      console.error(err);
      setFailedTransactions([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const loadLaunches = async () => {
      try {
        const { startDate, endDate } = getDateRangeFromPeriod(month);
        const filter: GetTransactionsFilter = { startDate, endDate };
        const data = await fetchLaunches(filter);
        if (mounted) setLaunches(normalizeLaunchesData(data || []));
      } catch (err) {
        console.error(err);
        if (mounted) setLaunches([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadLaunches();

    const loadFailedTransactions = async () => {
      try {
        const data = await fetchFailedTransactions();
        if (mounted) {
          setFailedTransactions(normalizeFailedTransactionsData(data || []));
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setFailedTransactions([]);
        }
      }
    };

    loadFailedTransactions();

    return () => {
      mounted = false;
    };
  }, [month, mode, year, accounts, categories]);

  function updateLaunch(updated: LaunchRow) {
    setLaunches(prev =>
      prev.map(l =>
        l.id === updated.id ? updated : l
      )
    );
  }

  function removeFailedTransaction(id: string) {
    setFailedTransactions((current) => current.filter((item) => item.id !== id));
  }

  const value = useMemo(
    () => ({
      failedTransactions,
      launches,
      isLoading,
      removeFailedTransaction,
      reloadFailedTransactions,
      updateLaunch,
      reloadLaunches,
    }),
    [failedTransactions, launches, isLoading]
  );

  return (
    <LaunchesContext.Provider value={value}>
      {children}
    </LaunchesContext.Provider>
  );
}
