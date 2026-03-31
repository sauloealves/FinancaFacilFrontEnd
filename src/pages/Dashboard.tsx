import { useState, useMemo, useEffect } from "react";
import { Card, Modal, Button, Input } from "../components/ui";
import { useLaunches } from "../contexts/launches/useLaunches";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { usePeriod } from "../contexts/usePeriodo";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { isTransactionType } from "../utils/sortUtils";
import ExpenseChart from "../features/charts/ExpenseChart";
import MonthlyComparisonChart from "../features/charts/MonthlyComparisonChart";
import EditLaunchModal from "../features/launches/EditLaunchModal";
import { askAi } from "../services/aiService";
import { getLaunches as fetchLaunches, type GetTransactionsFilter } from "../services/launchService";
import type { LaunchRow } from "../features/launches/types";

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

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [previousMonthLaunches, setPreviousMonthLaunches] = useState<LaunchRow[]>([]);
  const [editingLaunch, setEditingLaunch] = useState<LaunchRow | null>(null);
  const { launches, reloadLaunches } = useLaunches();
  const { accounts, reloadAccounts } = useAccounts();
  const { month } = usePeriod();
  const { selectedAccounts } = useAccountFilter();
  const aiResponseBlocks = useMemo(() => parseAiResponse(aiResponse), [aiResponse]);

  useEffect(() => {
    let mounted = true;

    function getPreviousMonth(monthText: string): string {
      const [yearText, monthNumberText] = monthText.split("-");
      const year = Number(yearText);
      const monthNumber = Number(monthNumberText);

      if (monthNumber > 1) {
        return `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
      }

      return `${year - 1}-12`;
    }

    function getDateRangeFromMonth(monthText: string) {
      const [year, monthNumber] = monthText.split("-");
      const startDate = `${year}-${monthNumber}-01`;
      const nextMonth = new Date(Number(year), Number(monthNumber), 1);
      nextMonth.setDate(0);
      const endDate = nextMonth.toISOString().split("T")[0];

      return { startDate, endDate };
    }

    async function loadPreviousMonthLaunches() {
      try {
        const previousMonth = getPreviousMonth(month);
        const { startDate, endDate } = getDateRangeFromMonth(previousMonth);
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

    void loadPreviousMonthLaunches();

    return () => {
      mounted = false;
    };
  }, [month]);

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

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];

    const filteredLaunches = filterLaunchesBySelectedAccounts(launches);
    const filteredPreviousMonthLaunches = filterLaunchesBySelectedAccounts(previousMonthLaunches);
    const comparisonLaunches = [
      ...filteredPreviousMonthLaunches,
      ...filteredLaunches,
    ];

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
      comparisonLaunches,
    };
  }, [launches, previousMonthLaunches, accounts, month, selectedAccounts]);

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
            setEditingLaunch(null);
          }}
        />
      )}

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

        <div className="dashboard-charts-grid">
          <Card title="Despesas por categoria">
            <ExpenseChart
              launches={dashboardData.filteredLaunches}
              month={month}
              maxItems={10}
              onLaunchClick={(launch) => setEditingLaunch(launch)}
            />
          </Card>

          <Card>
            <MonthlyComparisonChart
              launches={dashboardData.comparisonLaunches}
              month={month}
              type="expense"
            />
          </Card>

          <Card>
            <MonthlyComparisonChart
              launches={dashboardData.comparisonLaunches}
              month={month}
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
