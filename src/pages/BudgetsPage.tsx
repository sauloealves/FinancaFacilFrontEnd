import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Modal } from "../components/ui";
import BudgetStatusBadge from "../features/budgets/BudgetStatusBadge";
import "../features/budgets/budgets.css";
import type { BudgetListItem, BudgetStatus } from "../features/budgets/types";
import { createBudget, deleteBudget, duplicateBudget, getBudgets } from "../services/budgetService";
import { getErrorMessage } from "../services/api";

type CreateFormState = {
  name: string;
  year: string;
  status: BudgetStatus;
};

const initialCreateForm: CreateFormState = {
  name: "",
  year: String(new Date().getFullYear()),
  status: "planning",
};

export default function BudgetsPage() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetListItem | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, "duplicate" | "delete" | undefined>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadBudgets() {
      setLoading(true);
      setError("");

      try {
        const data = await getBudgets();
        if (isMounted) {
          setBudgets(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Não foi possível carregar os orçamentos."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadBudgets();

    return () => {
      isMounted = false;
    };
  }, []);

  const budgetCountLabel = useMemo(() => {
    if (budgets.length === 1) {
      return "1 orçamento";
    }

    return `${budgets.length} orçamentos`;
  }, [budgets.length]);

  async function handleCreateBudget() {
    if (!createForm.name.trim()) {
      setError("Informe um nome para o orçamento.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const created = await createBudget({
        name: createForm.name.trim(),
        year: Number(createForm.year),
        status: createForm.status,
      });

      setBudgets((current) => [created, ...current]);
      setCreateForm(initialCreateForm);
      setIsCreateOpen(false);
    } catch (createError) {
      setError(getErrorMessage(createError, "Não foi possível criar o orçamento."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicateBudget(budget: BudgetListItem) {
    setBusyIds((current) => ({ ...current, [budget.id]: "duplicate" }));
    setError("");

    try {
      const duplicated = await duplicateBudget(budget);
      setBudgets((current) => [duplicated, ...current]);
    } catch (duplicateError) {
      setError(getErrorMessage(duplicateError, "Não foi possível duplicar o orçamento."));
    } finally {
      setBusyIds((current) => ({ ...current, [budget.id]: undefined }));
    }
  }

  async function handleDeleteBudget() {
    if (!deleteTarget) {
      return;
    }

    setBusyIds((current) => ({ ...current, [deleteTarget.id]: "delete" }));
    setError("");

    try {
      await deleteBudget(deleteTarget.id);
      setBudgets((current) => current.filter((budget) => budget.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Não foi possível excluir o orçamento."));
    } finally {
      setBusyIds((current) => ({ ...current, [deleteTarget.id]: undefined }));
    }
  }

  return (
    <div className="budget-page">
      <section className="budget-hero">
        <div>
          <span className="budget-eyebrow">Budgeting</span>
          <h1>Orçamentos anuais</h1>
          <p>
            Planeje o ano inteiro, acompanhe execução mensal por categoria e entre no detalhe com edição otimista.
          </p>
        </div>

        <div className="budget-hero-actions">
          <span className="budget-count-chip">{budgetCountLabel}</span>
          <Button onClick={() => setIsCreateOpen(true)}>Criar novo orçamento</Button>
        </div>
      </section>

      {error && <div className="budget-feedback budget-feedback-error">{error}</div>}

      <Card title="Lista de orçamentos">
        {loading ? (
          <div className="budget-skeleton-list">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`budget-list-skeleton-${index}`} className="budget-skeleton-row" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="budget-empty-state">
            <strong>Nenhum orçamento cadastrado</strong>
            <p>Crie o primeiro orçamento anual para começar o planejamento financeiro.</p>
            <Button onClick={() => setIsCreateOpen(true)}>Criar orçamento</Button>
          </div>
        ) : (
          <div className="budget-table-shell">
            <table className="budget-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ano</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.id}>
                    <td>{budget.name}</td>
                    <td>{budget.year}</td>
                    <td>
                      <BudgetStatusBadge status={budget.status} />
                    </td>
                    <td>
                      <div className="budget-row-actions">
                        <Button variant="secondary" onClick={() => navigate(`/budgets/${budget.id}`)}>
                          Abrir orçamento
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void handleDuplicateBudget(budget)}
                          disabled={busyIds[budget.id] === "duplicate"}
                        >
                          Duplicar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setDeleteTarget(budget)}
                          disabled={busyIds[budget.id] === "delete"}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isCreateOpen}
        title="Novo orçamento"
        onClose={() => {
          setIsCreateOpen(false);
          setCreateForm(initialCreateForm);
        }}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreateBudget()} disabled={isSubmitting}>Salvar orçamento</Button>
          </>
        )}
      >
        <div className="budget-form-grid">
          <Input
            label="Nome"
            value={createForm.name}
            placeholder="Ex.: Orçamento Familiar 2026"
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Ano"
            type="number"
            value={createForm.year}
            onChange={(event) => setCreateForm((current) => ({ ...current, year: event.target.value }))}
          />
          <label className="budget-native-field">
            <span>Status inicial</span>
            <select
              value={createForm.status}
              onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as BudgetStatus }))}
            >
              <option value="planning">Planejamento</option>
              <option value="active">Ativo</option>
              <option value="closed">Encerrado</option>
            </select>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        title="Excluir orçamento"
        onClose={() => setDeleteTarget(null)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => void handleDeleteBudget()}>Confirmar exclusão</Button>
          </>
        )}
      >
        <p className="budget-confirmation-copy">
          Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não poderá ser desfeita.
        </p>
      </Modal>
    </div>
  );
}