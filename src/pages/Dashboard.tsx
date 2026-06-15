import { useState, useMemo, useEffect } from "react";
import { Card, Modal, Button, Input } from "../components/ui";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { usePeriod } from "../contexts/usePeriodo";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { isTransactionType } from "../utils/sortUtils";
import { calculateAccountCurrentBalance } from "../utils/calculateAccountCurrentBalance";
import ExpenseChart from "../features/charts/ExpenseChart";
import MonthlyComparisonChart from "../features/charts/MonthlyComparisonChart";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { askAi } from "../services/aiService";
import { getLaunches as fetchLaunches, type GetTransactionsFilter } from "../services/launchService";
import type { LaunchRow } from "../features/launches/types";
import type { PeriodMode } from "../contexts/period.types";

import "./Dashboard.css";

type AiResponseBlock =
  | { key: string; type: "heading"; level: number; content: string }
  | { key: string; type: "paragraph"; content: string }
  | { key: string; type: "ordered-list"; items: string[] }
  | { key: string; type: "unordered-list"; items: string[] };

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\d+\.\s+(.+)$/;
const UNORDERED_LIST_PATTERN = /^-\s+(.+)$/;

function normalizeAiResponse(rawText: string): string {
  return rawText
    .replaceAll("\r\n", "\n")
    .replaceAll(/([^\n])\s*(#{1,6}\s+)/g, "$1\n\n$2")
    .replaceAll(/([^\n])\s*(\d+\.\s+)/g, "$1\n$2")
    .replaceAll(/([^\n])\s*(-\s+)/g, "$1\n$2")
    .replaceAll(/([^\n])\s*(?=####?\s+)/g, "$1\n\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

function createAiBlockKey(prefix: string, value: string): string {
  return `${prefix}-${value}`;
}

function collectListItems(lines: string[], startIndex: number, pattern: RegExp) {
  const items: string[] = [];
  let currentIndex = startIndex;

  while (currentIndex < lines.length) {
    const currentLine = lines[currentIndex].trim();
    const match = pattern.exec(currentLine);

    if (!match) {
      break;
    }

    items.push(match[1].trim());
    currentIndex += 1;
  }

  return { items, nextIndex: currentIndex };
}

function collectParagraph(lines: string[], startIndex: number) {
  const paragraphLines: string[] = [];
  let currentIndex = startIndex;

  while (currentIndex < lines.length) {
    const currentLine = lines[currentIndex].trim();

    if (
      !currentLine ||
      HEADING_PATTERN.test(currentLine) ||
      ORDERED_LIST_PATTERN.test(currentLine) ||
      UNORDERED_LIST_PATTERN.test(currentLine)
    ) {
      break;
    }

    paragraphLines.push(currentLine);
    currentIndex += 1;
  }

  return {
    content: paragraphLines.join(" "),
    nextIndex: currentIndex,
  };
}

function parseAiResponse(rawText: string): AiResponseBlock[] {
  const normalizedText = normalizeAiResponse(rawText);

  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText.split("\n");
  const blocks: AiResponseBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      blocks.push({
        key: createAiBlockKey("heading", `${headingMatch[1].length}-${headingMatch[2].trim()}`),
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (ORDERED_LIST_PATTERN.test(line)) {
      const { items, nextIndex } = collectListItems(lines, index, ORDERED_LIST_PATTERN);

      blocks.push({
        key: createAiBlockKey("ordered", items.join("|")),
        type: "ordered-list",
        items,
      });
      index = nextIndex;
      continue;
    }

    if (UNORDERED_LIST_PATTERN.test(line)) {
      const { items, nextIndex } = collectListItems(lines, index, UNORDERED_LIST_PATTERN);

      blocks.push({
        key: createAiBlockKey("unordered", items.join("|")),
        type: "unordered-list",
        items,
      });
      index = nextIndex;
      continue;
    }

    const paragraph = collectParagraph(lines, index);

    blocks.push({
      key: createAiBlockKey("paragraph", paragraph.content),
      type: "paragraph",
      content: paragraph.content,
    });
    index = paragraph.nextIndex;
  }

  return blocks;
}

function renderAiInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function getPreviousPeriod(monthText: string, mode: PeriodMode): string {
  const [yearText, monthNumberText] = monthText.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthNumberText);

  if (mode === "yearly") {
    return `${year - 1}-${monthNumberText}`;
  }

  if (monthNumber > 1) {
    return `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
  }

  return `${year - 1}-12`;
}

function getDateRangeFromPeriod(monthText: string, mode: PeriodMode): GetTransactionsFilter {
  if (mode === "yearly") {
    const year = monthText.slice(0, 4);
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  const [year, monthNumber] = monthText.split("-");
  const startDate = `${year}-${monthNumber}-01`;
  const nextMonth = new Date(Number(year), Number(monthNumber), 1);
  nextMonth.setDate(0);
  const endDate = nextMonth.toISOString().split("T")[0];

  return { startDate, endDate };
}

function getLocalTodayDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [periodBalanceLaunches, setPeriodBalanceLaunches] = useState<LaunchRow[]>([]);
  const [previousMonthLaunches, setPreviousMonthLaunches] = useState<LaunchRow[]>([]);
  const [upcomingCommitmentLaunches, setUpcomingCommitmentLaunches] = useState<LaunchRow[]>([]);
  const [editingLaunch, setEditingLaunch] = useState<LaunchRow | null>(null);
  const { launches, reloadLaunches } = useLaunches();
  const { accounts, reloadAccounts } = useAccounts();
  const { month, mode } = usePeriod();
  const { selectedAccounts } = useAccountFilter();
  const aiResponseBlocks = useMemo(() => parseAiResponse(aiResponse), [aiResponse]);

  useEffect(() => {
    let mounted = true;

    async function loadPeriodBalanceLaunches() {
      try {
        const { endDate } = getDateRangeFromPeriod(month, mode);
        const data = await fetchLaunches({ endDate });

        if (mounted) {
          setPeriodBalanceLaunches(data ?? []);
        }
      } catch (error) {
        console.error("Erro ao carregar lançamentos para saldo final do período:", error);
        if (mounted) {
          setPeriodBalanceLaunches([]);
        }
      }
    }

    async function loadPreviousMonthLaunches() {
      try {
        const previousMonth = getPreviousPeriod(month, mode);
        const { startDate, endDate } = getDateRangeFromPeriod(previousMonth, mode);
        const filter: GetTransactionsFilter = { startDate, endDate };
        const data = await fetchLaunches(filter);

        if (mounted) {
          setPreviousMonthLaunches(data ?? []);
        }
      } catch (error) {
        console.error("Erro ao carregar lançamentos do mês anterior:", error);
        if (mounted) {
          setPreviousMonthLaunches([]);
        }
      }
    }

    void loadPeriodBalanceLaunches();
    void loadPreviousMonthLaunches();

    return () => {
      mounted = false;
    };
  }, [month, mode]);

  useEffect(() => {
    let mounted = true;

    async function loadUpcomingCommitments() {
      try {
        const data = await fetchLaunches({ startDate: getLocalTodayDate() });

        if (mounted) {
          setUpcomingCommitmentLaunches(data ?? []);
        }
      } catch (error) {
        console.error("Erro ao carregar próximos compromissos:", error);
        if (mounted) {
          setUpcomingCommitmentLaunches([]);
        }
      }
    }

    void loadUpcomingCommitments();

    return () => {
      mounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const filterLaunchesBySelectedAccounts = (sourceLaunches: LaunchRow[]) =>
      selectedAccounts.length === 0
        ? sourceLaunches
        : sourceLaunches.filter((launch) => {
            if (isTransactionType(launch.type, "transfer")) {
              return (
                selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
                selectedAccounts.includes(launch.toAccount?.id ?? "")
              );
            }

            return selectedAccounts.includes(launch.account?.id ?? "");
          });

    const filteredLaunches = filterLaunchesBySelectedAccounts(launches);
    const filteredPeriodBalanceLaunches = filterLaunchesBySelectedAccounts(periodBalanceLaunches);
    const filteredPreviousMonthLaunches = filterLaunchesBySelectedAccounts(previousMonthLaunches);
    const filteredUpcomingCommitmentLaunches = filterLaunchesBySelectedAccounts(upcomingCommitmentLaunches);
    const comparisonLaunches = [
      ...filteredPreviousMonthLaunches,
      ...filteredLaunches,
    ];
    const periodPrefix = mode === "yearly" ? `${month.slice(0, 4)}-` : month;

    const filteredAccounts =
      selectedAccounts.length === 0
        ? accounts
        : accounts.filter((account) => selectedAccounts.includes(account.id));

    const currentBalance = filteredAccounts.reduce(
      (sum, acc) => sum + (acc.currentBalance || 0),
      0
    );

    const periodEndingBalance = filteredAccounts.reduce(
      (sum, acc) => sum + calculateAccountCurrentBalance(acc, filteredPeriodBalanceLaunches),
      0
    );

    // Lançamentos do mês selecionado
    const selectedMonthLaunches = filteredLaunches.filter((launch) => {
      const launchMonth = launch.date.substring(0, 7);
      return launchMonth.startsWith(periodPrefix) && !isTransactionType(launch.type, "transfer");
    });

    const periodIncome = selectedMonthLaunches
      .filter(l => isTransactionType(l.type, "income"))
      .reduce((sum, l) => sum + l.value, 0);

    const periodExpense = selectedMonthLaunches
      .filter(l => isTransactionType(l.type, "expense"))
      .reduce((sum, l) => sum + Math.abs(l.value), 0);

    const periodResult = periodIncome - periodExpense;

    // Últimos lançamentos (ordenados por data descendente, sem transferências)
    const recentLaunches = filteredLaunches
      .filter(l => !isTransactionType(l.type, "transfer"))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    // Próximos compromissos a partir da data atual
    const upcomingLaunches = filteredUpcomingCommitmentLaunches
      .filter((launch) => !isTransactionType(launch.type, "transfer"))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    return {
      currentBalance,
      periodEndingBalance,
      periodIncome,
      periodExpense,
      periodResult,
      recentLaunches,
      upcomingLaunches,
      filteredLaunches,
      comparisonLaunches,
    };
  }, [launches, periodBalanceLaunches, previousMonthLaunches, upcomingCommitmentLaunches, accounts, mode, month, selectedAccounts]);

  const periodLabel = mode === "yearly" ? "ano" : "mês";

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
      const descricao = await askAi(trimmedQuery);
      setAiResponse(descricao);
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

      {editingLaunch && (
        <EditLaunchModal
          launch={editingLaunch}
          onClose={() => setEditingLaunch(null)}
          onSave={async () => {
            await reloadLaunches();
            await reloadAccounts();
            setUpcomingCommitmentLaunches(await fetchLaunches({ startDate: getLocalTodayDate() }));
            setEditingLaunch(null);
          }}
        />
      )}

      <div className="dashboard">
        {/* KPI CARDS */}
        <div className="dashboard-kpis">
          <Card title="Saldo Atual">
            <span className="kpi-value">{formatCurrency(dashboardData.currentBalance)}</span>
          </Card>

          <Card title="Saldo Final Período">
            <span className="kpi-value">{formatCurrency(dashboardData.periodEndingBalance)}</span>
          </Card>

          <Card title={`Entradas do ${periodLabel}`}>
            <span className="kpi-value positive">{formatCurrency(dashboardData.periodIncome)}</span>
          </Card>

          <Card title={`Saídas do ${periodLabel}`}>
            <span className="kpi-value negative">{formatCurrency(dashboardData.periodExpense)}</span>
          </Card>

          <Card title="Resultado">
            <span className={`kpi-value ${dashboardData.periodResult >= 0 ? "positive" : "negative"}`}>
              {formatCurrency(dashboardData.periodResult)}
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

        <div className="dashboard-charts-grid">
          <Card title="Despesas por categoria">
            <ExpenseChart
              launches={dashboardData.filteredLaunches}
              month={month}
              periodMode={mode}
              maxItems={10}
              onLaunchClick={(launch) => setEditingLaunch(launch)}
            />
          </Card>

          <Card>
            <MonthlyComparisonChart
              launches={dashboardData.comparisonLaunches}
              month={month}
              periodMode={mode}
              type="expense"
            />
          </Card>

          <Card>
            <MonthlyComparisonChart
              launches={dashboardData.comparisonLaunches}
              month={month}
              periodMode={mode}
              type="income"
            />
          </Card>
        </div>

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
                {aiResponseBlocks.map((block) => {
                  if (block.type === "heading") {
                    const HeadingTag = block.level <= 2 ? "h3" : "h4";

                    return (
                      <HeadingTag key={block.key} className="dashboard-ai-response-heading">
                        {renderAiInline(block.content)}
                      </HeadingTag>
                    );
                  }

                  if (block.type === "ordered-list") {
                    return (
                      <ol key={block.key} className="dashboard-ai-response-list ordered">
                        {block.items.map((item, itemIndex) => (
                          <li key={`ordered-item-${block.key}-${itemIndex}`}>
                            {renderAiInline(item)}
                          </li>
                        ))}
                      </ol>
                    );
                  }

                  if (block.type === "unordered-list") {
                    return (
                      <ul key={block.key} className="dashboard-ai-response-list unordered">
                        {block.items.map((item, itemIndex) => (
                          <li key={`unordered-item-${block.key}-${itemIndex}`}>
                            {renderAiInline(item)}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p key={block.key} className="dashboard-ai-response-paragraph">
                      {renderAiInline(block.content)}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
