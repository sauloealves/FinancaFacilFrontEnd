
import { useState, useMemo } from "react";
import { Card, Modal, Button, Input } from "../components/ui";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { usePeriod } from "../contexts/usePeriodo";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { isTransactionType } from "../utils/sortUtils";
import ExpenseChart from "../features/charts/ExpenseChart";
import { askAi } from "../services/aiService";

import "./Dashboard.css";

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const { launches } = useLaunches();
  const { accounts } = useAccounts();
  const { month } = usePeriod();
  const { selectedAccounts } = useAccountFilter();

  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];

    const filteredLaunches =
      selectedAccounts.length === 0
        ? launches
        : launches.filter((launch) => {
            if (isTransactionType(launch.type, "transfer")) {
              return (
                selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
                selectedAccounts.includes(launch.toAccount?.id ?? "")
              );
            }

            return selectedAccounts.includes(launch.account?.id ?? "");
          });

    const filteredAccounts =
      selectedAccounts.length === 0
        ? accounts
        : accounts.filter((account) => selectedAccounts.includes(account.id));

    // Saldo Atual: soma de todos os saldos das contas
    const totalBalance = filteredAccounts.reduce(
      (sum, acc) => sum + (acc.currentBalance || 0),
      0
    );

    // Lançamentos do mês selecionado
    const selectedMonthLaunches = filteredLaunches.filter((launch) => {
      const launchMonth = launch.date.substring(0, 7);
      return launchMonth === month && !isTransactionType(launch.type, "transfer");
    });

    // Entradas do mês (receitas)
    const monthlyIncome = selectedMonthLaunches
      .filter(l => isTransactionType(l.type, "income"))
      .reduce((sum, l) => sum + l.value, 0);

    // Saídas do mês (despesas)
    const monthlyExpense = selectedMonthLaunches
      .filter(l => isTransactionType(l.type, "expense"))
      .reduce((sum, l) => sum + Math.abs(l.value), 0);

    // Resultado do mês
    const monthlyResult = monthlyIncome - monthlyExpense;

    // Últimos lançamentos (ordenados por data descendente, sem transferências)
    const recentLaunches = filteredLaunches
      .filter(l => !isTransactionType(l.type, "transfer"))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    // Próximos compromissos (recorrentes ou com data futura)
    const upcomingLaunches = filteredLaunches
      .filter(l => {
        const isRecurring = l.occurrenceType === "recurring";
        const isFuture = l.date > currentDate;
        return !isTransactionType(l.type, "transfer") && (isRecurring || isFuture);
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyResult,
      recentLaunches,
      upcomingLaunches,
      filteredLaunches,
    };
  }, [launches, accounts, month, selectedAccounts]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  async function handleAskAi() {
    const trimmedQuery = aiQuery.trim();
    if (!trimmedQuery) {
      setAiError("Digite uma pergunta para consultar a IA.");
      setAiResponse("");
      return;
    }

    try {
      setIsAskingAi(true);
      setAiError("");
      const response = await askAi(trimmedQuery);
      setAiResponse(response);
    } catch (error) {
      console.error("Erro ao consultar IA:", error);
      setAiResponse("");
      setAiError("Não foi possível consultar a IA agora. Tente novamente.");
    } finally {
      setIsAskingAi(false);
    }
  }

  return (
    <>
      <Modal
        isOpen={open}
        title="Teste de Modal"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button>
              Salvar
            </Button>
          </>
        }
      >
        Conteúdo do modal aqui
      </Modal>

      <div className="dashboard">
        {/* KPI CARDS */}
        <div className="dashboard-kpis">
          <Card title="Saldo Atual">
            <span className="kpi-value">{formatCurrency(dashboardData.totalBalance)}</span>
          </Card>

          <Card title="Entradas do mês">
            <span className="kpi-value positive">{formatCurrency(dashboardData.monthlyIncome)}</span>
          </Card>

          <Card title="Saídas do mês">
            <span className="kpi-value negative">{formatCurrency(dashboardData.monthlyExpense)}</span>
          </Card>

          <Card title="Resultado">
            <span className={`kpi-value ${dashboardData.monthlyResult >= 0 ? "positive" : "negative"}`}>
              {formatCurrency(dashboardData.monthlyResult)}
            </span>
          </Card>
        </div>

        {/* SEÇÃO INFERIOR */}
        <div className="dashboard-grid">
          <Card title="Últimos lançamentos">
            {dashboardData.recentLaunches.length > 0 ? (
              <ul className="list">
                {dashboardData.recentLaunches.map((launch) => (
                  <li key={launch.id}>
                    {launch.description} — {formatCurrency(launch.value)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#999", fontSize: "14px" }}>Nenhum lançamento registrado</p>
            )}
          </Card>

          <Card title="Próximos compromissos">
            {dashboardData.upcomingLaunches.length > 0 ? (
              <ul className="list">
                {dashboardData.upcomingLaunches.map((launch) => (
                  <li key={launch.id}>
                    {launch.description} — {formatDate(launch.date)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#999", fontSize: "14px" }}>Nenhum compromisso futuro</p>
            )}
          </Card>
        </div>

        {/* GRÁFICO DE DESPESAS */}
        <Card title="Despesas por categoria">
          <ExpenseChart launches={dashboardData.filteredLaunches} month={month} />
        </Card>

        <Card title="Pergunte para a IA">
          <div className="dashboard-ai">
            <p className="dashboard-ai-hint">
              Faça uma pergunta sobre seus gastos, receitas ou comportamento financeiro.
            </p>

            <div className="dashboard-ai-form">
              <Input
                label="Pergunta"
                value={aiQuery}
                placeholder="Ex: Quanto gastei neste mês?"
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAskAi();
                  }
                }}
              />
              <Button onClick={handleAskAi} disabled={isAskingAi}>
                {isAskingAi ? "Consultando..." : "Perguntar"}
              </Button>
            </div>

            {aiError && <p className="dashboard-ai-error">{aiError}</p>}

            {aiResponse && (
              <div className="dashboard-ai-response">
                {aiResponse}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
