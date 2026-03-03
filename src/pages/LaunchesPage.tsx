import { useState } from "react";
import LaunchTable from "../features/launches/LauncheTable";
import { normalizeLaunches } from "../features/launches/normalizeLaunches";
import { usePeriod } from "../contexts/usePeriodo";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import type { LaunchRow } from "../features/launches/types";
import { useLaunches } from "../contexts/launches/useLaunches";
import { isTransactionType } from "../utils/sortUtils";
/**
 * Página de Lançamentos
 * Caminho: /launches
 */
export default function LaunchesPage() {
  const { month } = usePeriod();
  const [editing, setEditing] = useState<LaunchRow | null>(null);
  const { selectedAccounts } = useAccountFilter();
  const openingBalanceByMonth: Record<string, number> = {
    "2026-01": 3000,
    "2026-02": 3250,
  };
  const { launches, updateLaunch } = useLaunches();

  const filteredLaunches =
  selectedAccounts.length === 0
    ? launches
    : launches.filter(l => {
        if (isTransactionType(l.type, "transfer")) {
          return (
            selectedAccounts.includes(l.fromAccount?.id ?? "") ||
            selectedAccounts.includes(l.toAccount?.id ?? "")
          );
        }

        return selectedAccounts.includes(l.account?.id ?? "");
      });

  const tableData = normalizeLaunches({
    month: month,
    openingBalance: openingBalanceByMonth[month] ?? 0,
    launches: filteredLaunches,
  });
    

  return (
    <div className="launches-page">
      <LaunchTable data={tableData} 
        onEdit={row => setEditing(row)}
      />
      {editing && (
      <EditLaunchModal
        launch={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => {
            updateLaunch(updated); 
            setEditing(null);
          }}
      />
    )}

    </div>
  );
}


