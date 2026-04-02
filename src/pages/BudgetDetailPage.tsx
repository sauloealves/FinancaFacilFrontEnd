import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { useCategories } from "../contexts/categories/useCategories";
import BudgetCategoryStatusList from "../features/budgets/BudgetCategoryStatusList";
import BudgetDashboardCharts from "../features/budgets/BudgetDashboardCharts";
import BudgetMonthDetailPanel from "../features/budgets/BudgetMonthDetailPanel";
import BudgetPlannerGrid from "../features/budgets/BudgetPlannerGrid";
import BudgetStatusBadge from "../features/budgets/BudgetStatusBadge";
import BudgetSummaryCards from "../features/budgets/BudgetSummaryCards";
import "../features/budgets/budgets.css";
import type { BudgetDetail, BudgetTransaction, UpdateBudgetItemPayload } from "../features/budgets/types";
import { rebuildBudgetDetail } from "../features/budgets/utils";
import { getErrorMessage } from "../services/api";
import {
  applyBudgetCategoryFallback,
  getBudgetDetail,
  getBudgetTransactions,
  updateBudgetItem,
} from "../services/budgetService";

type BudgetTab = "overview" | "planning" | "months";

function buildSavingKey(categoryId: string, monthKey: string): string {
  return `${categoryId}:${monthKey}`;
}

export default function BudgetDetailPage() {
  const { budgetId = "" } = useParams();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [detail, setDetail] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<BudgetTab>("overview");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function loadBudgetDetail() {
      setLoading(true);
      setError("");

      try {
        const data = await getBudgetDetail(budgetId);

        if (!isMounted) {
          return;
        }

        const hydratedData = applyBudgetCategoryFallback(data, categories);
        setDetail(hydratedData);
        const currentMonthKey = `${hydratedData.year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        const initialMonth = hydratedData.months.find((month) => month.monthKey === currentMonthKey) ?? hydratedData.months[0];
        setSelectedMonthKey(initialMonth?.monthKey ?? "");
        setSelectedCategoryId(initialMonth?.categories[0]?.categoryId ?? null);
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Não foi possível carregar o orçamento."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (budgetId) {
      void loadBudgetDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [budgetId, categories]);

  const selectedMonth = useMemo(
    () => detail?.months.find((month) => month.monthKey === selectedMonthKey) ?? null,
    [detail?.months, selectedMonthKey],
  );

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedCategoryId(null);
      return;
    }

    const categoryExists = selectedMonth.categories.some((category) => category.categoryId === selectedCategoryId);
    if (!categoryExists) {
      setSelectedCategoryId(selectedMonth.categories[0]?.categoryId ?? null);
    }
  }, [selectedCategoryId, selectedMonth]);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      if (!selectedMonthKey || !selectedCategoryId || !selectedMonth) {
        setTransactions([]);
        return;
      }

      const selectedCategory = selectedMonth.categories.find((category) => category.categoryId === selectedCategoryId);
      setTransactionsLoading(true);

      try {
        const data = await getBudgetTransactions({
          month: selectedMonthKey,
          categoryId: selectedCategoryId,
          category: selectedCategory?.categoryName,
        });

        if (isMounted) {
          setTransactions(data);
        }
      } catch (transactionError) {
        if (isMounted) {
          setError(getErrorMessage(transactionError, "Não foi possível carregar os lançamentos do mês."));
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setTransactionsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [selectedCategoryId, selectedMonth, selectedMonthKey]);

  async function handleUpdateCell(payload: UpdateBudgetItemPayload) {
    if (!detail) {
      return;
    }

    const snapshot = detail;
    const savingKey = buildSavingKey(payload.categoryId, payload.monthKey);
    setSavingKeys((current) => new Set(current).add(savingKey));

    const optimisticRows = detail.plannerRows.map((row) => {
      if (row.categoryId !== payload.categoryId) {
        return row;
      }

      return {
        ...row,
        months: row.months.map((month) => (
          month.monthKey === payload.monthKey
            ? {
                ...month,
                planned: payload.planned,
                itemId: payload.itemId ?? month.itemId,
                budgetMonthId: payload.budgetMonthId ?? month.budgetMonthId,
              }
            : month
        )),
      };
    });

    setDetail(rebuildBudgetDetail(detail, optimisticRows));

    try {
      const result = await updateBudgetItem(payload);
      setDetail((current) => {
        if (!current) {
          return current;
        }

        const syncedRows = current.plannerRows.map((row) => {
          if (row.categoryId !== payload.categoryId) {
            return row;
          }

          return {
            ...row,
            months: row.months.map((month) => (
              month.monthKey === payload.monthKey
                ? {
                    ...month,
                    itemId: result.itemId ?? month.itemId,
                    budgetMonthId: result.budgetMonthId ?? month.budgetMonthId,
                    planned: result.planned,
                    realized: result.realized || month.realized,
                  }
                : month
            )),
          };
        });

        return rebuildBudgetDetail(current, syncedRows);
      });
    } catch (updateError) {
      setDetail(snapshot);
      setError(getErrorMessage(updateError, "Não foi possível salvar a alteração do orçamento."));
    } finally {
      setSavingKeys((current) => {
        const next = new Set(current);
        next.delete(savingKey);
        return next;
      });
    }
  }

  async function handleBulkUpdate(payloads: UpdateBudgetItemPayload[]) {
    if (!detail || payloads.length === 0) {
      return;
    }

    const snapshot = detail;
    const nextSavingKeys = new Set(savingKeys);
    payloads.forEach((payload) => nextSavingKeys.add(buildSavingKey(payload.categoryId, payload.monthKey)));
    setSavingKeys(nextSavingKeys);

    const optimisticRows = detail.plannerRows.map((row) => {
      if (row.categoryId !== payloads[0].categoryId) {
        return row;
      }

      return {
        ...row,
        months: row.months.map((month) => {
          const match = payloads.find((payload) => payload.monthKey === month.monthKey);
          return match
            ? {
                ...month,
                planned: match.planned,
                itemId: match.itemId ?? month.itemId,
                budgetMonthId: match.budgetMonthId ?? month.budgetMonthId,
              }
            : month;
        }),
      };
    });

    setDetail(rebuildBudgetDetail(detail, optimisticRows));

    try {
      const results = await Promise.all(payloads.map((payload) => updateBudgetItem(payload)));
      setDetail((current) => {
        if (!current) {
          return current;
        }

        const syncedRows = current.plannerRows.map((row) => {
          if (row.categoryId !== payloads[0].categoryId) {
            return row;
          }

          return {
            ...row,
            months: row.months.map((month) => {
              const result = results.find((item) => item.monthKey === month.monthKey);
              return result
                ? {
                    ...month,
                    itemId: result.itemId ?? month.itemId,
                    budgetMonthId: result.budgetMonthId ?? month.budgetMonthId,
                    planned: result.planned,
                    realized: result.realized || month.realized,
                  }
                : month;
            }),
          };
        });

        return rebuildBudgetDetail(current, syncedRows);
      });
    } catch (updateError) {
      setDetail(snapshot);
      setError(getErrorMessage(updateError, "Não foi possível aplicar a atualização em lote."));
    } finally {
      setSavingKeys((current) => {
        const next = new Set(current);
        payloads.forEach((payload) => next.delete(buildSavingKey(payload.categoryId, payload.monthKey)));
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="budget-page">
        <div className="budget-skeleton-hero" />
        <div className="budget-skeleton-list">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={`detail-skeleton-${index}`} className="budget-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="budget-page">
        <Card title="Orçamento não encontrado">
          <div className="budget-empty-state">
            <strong>Não foi possível abrir este orçamento.</strong>
            <p>{error || "Verifique se o orçamento ainda existe ou tente novamente mais tarde."}</p>
            <Button variant="secondary" onClick={() => navigate("/budgets")}>Voltar para a lista</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="budget-page">
      <section className="budget-detail-hero">
        <div>
          <button type="button" className="budget-back-link" onClick={() => navigate("/budgets")}>
            ← Voltar para orçamentos
          </button>
          <div className="budget-title-row">
            <h1>{detail.name}</h1>
            <BudgetStatusBadge status={detail.status} />
          </div>
          <p>
            Ano {detail.year}. {detail.description || "Acompanhe o planejamento anual, a execução por categoria e faça ajustes inline com resposta imediata."}
          </p>
        </div>

        <div className="budget-tab-group">
          {[
            ["overview", "Dashboard"],
            ["planning", "Planejamento"],
            ["months", "Detalhe do mês"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`budget-tab ${activeTab === value ? "is-active" : ""}`}
              onClick={() => setActiveTab(value as BudgetTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="budget-feedback budget-feedback-error">{error}</div>}

      {activeTab === "overview" && (
        <>
          <BudgetSummaryCards summary={detail.summary} />
          <BudgetDashboardCharts
            summary={detail.summary}
            onSelectMonth={(monthKey) => {
              setSelectedMonthKey(monthKey);
              setActiveTab("months");
            }}
          />
          <BudgetCategoryStatusList categories={detail.summary.categoryDistribution} />
        </>
      )}

      {activeTab === "planning" && (
        <Card title="Planejamento por categoria">
          <div className="budget-planner-copy">
            <p>
              Edite inline, navegue com teclado e aplique ações rápidas por categoria sem perder o contexto do realizado.
            </p>
          </div>
          <BudgetPlannerGrid
            rows={detail.plannerRows}
            savingKeys={savingKeys}
            onUpdateCell={handleUpdateCell}
            onBulkUpdate={handleBulkUpdate}
          />
        </Card>
      )}

      {activeTab === "months" && (
        <>
          <Card title="Selecione o mês">
            <div className="budget-month-selector">
              {detail.months.map((month) => (
                <button
                  key={month.monthKey}
                  type="button"
                  className={`budget-month-chip ${selectedMonthKey === month.monthKey ? "is-active" : ""}`}
                  onClick={() => setSelectedMonthKey(month.monthKey)}
                >
                  <span>{month.label}</span>
                  <strong>{month.realizedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </button>
              ))}
            </div>
          </Card>

          <BudgetMonthDetailPanel
            month={selectedMonth}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            transactions={transactions}
            isTransactionsLoading={transactionsLoading}
          />
        </>
      )}
    </div>
  );
}