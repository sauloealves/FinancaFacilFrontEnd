import { useState, useEffect } from "react";
import LaunchTable from "../features/launches/LauncheTable";
import { normalizeLaunches } from "../features/launches/normalizeLaunches";
import { usePeriod } from "../contexts/usePeriodo";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import type { LaunchRow } from "../features/launches/types";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { isTransactionType } from "../utils/sortUtils";
import { getOpeningBalance } from "../services/launchService";

/**
 * Página de Lançamentos
 * Caminho: /launches
 */
export default function LaunchesPage() {
  const { month } = usePeriod();
  const [editing, setEditing] = useState<LaunchRow | null>(null);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const { selectedAccounts } = useAccountFilter();
  const { launches, reloadLaunches } = useLaunches();
  const { reloadAccounts } = useAccounts();

  // Carrega o saldo inicial quando o mês ou contas selecionadas mudarem
  useEffect(() => {
    const loadBalance = async () => {
      setLoadingBalance(true);
      const [year, monthNum] = month.split("-");
      // Se há contas selecionadas, busca saldo apenas delas; caso contrário, busca total
      const balance = await getOpeningBalance(
        Number(year), 
        Number(monthNum), 
        1,
        selectedAccounts.length > 0 ? selectedAccounts : undefined
      );
      setOpeningBalance(balance);
      setLoadingBalance(false);
    };

    loadBalance();
  }, [month, selectedAccounts]);

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
    openingBalance: openingBalance,
    launches: filteredLaunches,
  });
    

  return (
    <div className="launches-page">
      {loadingBalance ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Carregando saldo inicial...</div>
      ) : (
        <LaunchTable data={tableData} 
          onEdit={row => setEditing(row)}
        />
      )}
      {editing && (
      <EditLaunchModal
        launch={editing}
        onClose={() => setEditing(null)}
        onSave={async () => {
            await reloadLaunches();
            await reloadAccounts();
            setEditing(null);
          }}
      />
    )}

    </div>
  );
}


