import { useEffect, useRef, useState } from "react";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { useAccountFilter } from "../../contexts/AccountFilterContext";
import { createCategory } from "../../services/categoryService";
import { createTransaction } from "../../services/launchService";
import CategoryModal from "../categories/CategoryModal";
import { Modal, Input, Button } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import "./expenseModal.css";
import AccountModal from "../accounts/components/AccountModal";
import { sortCategoriesHierarchically } from "../../utils/sortUtils";
import { parseBRL } from "../../utils/currency";

type ExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LaunchType = "single" | "installment" | "recurring";

type RecurrenceType = "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";

type FormState = {
  description: string;
  value: string;
  category: string;
  account: string;
  startDate: string;

  installmentFrom: number;
  installmentTo: number;

  recurrence: RecurrenceType;
  hasEndDate: boolean;
  endDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function ExpenseModal({ isOpen, onClose }: Readonly<ExpenseModalProps>) {
  const { accounts, addAccount, reloadAccounts } = useAccounts();
  const { categories, addCategory, reloadCategories } = useCategories();
  const { reloadLaunches } = useLaunches();
  const { selectedAccounts } = useAccountFilter();
  const [type, setType] = useState<LaunchType>("single");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const selectedSidebarAccountId =
    selectedAccounts.find(id => accounts.some(account => account.id === id)) ?? "";

  const [form, setForm] = useState<FormState>({
    description: "",
    value: "",
    category: "",
    account: selectedSidebarAccountId,
    startDate: "",
    installmentFrom: 1,
    installmentTo: 1,
    recurrence: "monthly",
    hasEndDate: false,
    endDate: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm(prev => ({
      ...prev,
      account: selectedSidebarAccountId,
    }));
  }, [isOpen, selectedSidebarAccountId]);

  function changeType(newType: LaunchType) {
    setType(newType);
    setErrors({});
  }

  function validate(): boolean {
    const e: FormErrors = {};

    if (!form.description.trim()) e.description = "Descrição é obrigatória";
    if (!form.value || parseBRL(form.value) <= 0) e.value = "Informe um valor válido";
    if (!form.category) e.category = "Selecione uma categoria";
    if (!form.startDate) e.startDate = "Data Lançamento é obrigatória";
    if (!form.account) e.account = "Selecione uma conta";

    if (type === "installment") {
      if (form.installmentTo < form.installmentFrom) {
        e.installmentTo = "Parcela final deve ser maior ou igual à inicial";
      }
      if (form.installmentTo <= 1) {
        e.installmentTo = "Parcelamento deve ter mais de 1 parcela";
      }
    }

    if (type === "recurring" && form.hasEndDate) {
      if (!form.endDate) {
        e.endDate = "Data final é obrigatória";
      } else if (form.endDate <= form.startDate) {
        e.endDate = "Data final deve ser maior que a data inicial";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateField(field: keyof FormState, value: unknown): void {
    const message = getFieldValidationMessage(field, value);
    setErrors(prev => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function getFieldValidationMessage(field: keyof FormState, value: unknown): string {
    switch (field) {
      case "description":
        return String(value).trim() ? "" : "Descrição é obrigatória";
      case "value":
        return typeof value === "string" && parseBRL(value) > 0
          ? ""
          : "Informe um valor válido";
      case "category":
        return value ? "" : "Selecione uma categoria";
      case "account":
        return value ? "" : "Selecione uma conta";
      case "startDate":
        return value ? "" : "Data Lançamento é obrigatória";
      case "endDate":
        return getEndDateValidationMessage(value);
      default:
        return "";
    }
  }

  function getEndDateValidationMessage(value: unknown): string {
    if (!form.hasEndDate) return "";
    if (!value) return "Data final é obrigatória";
    return (value as string) <= form.startDate ? "Data final deve ser maior que a data inicial" : "";
  }

  function handleSubmit() {
    if (!validate() || isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);

    const expense = {
      type: "expense" as const,
      description: form.description.trim(),
      value: parseBRL(form.value),
      categoryId: form.category,
      accountId: form.account,
      startDate: form.startDate,
      occurrenceType: type,
      ...(type === "installment" && {
        installmentFrom: form.installmentFrom,
        installmentTo: form.installmentTo,
      }),
      ...(type === "recurring" && {
        recurrence: form.recurrence,
        endDate: form.hasEndDate ? form.endDate : null,
      }),
    };

    createTransaction(expense)
      .then(async () => {
        await reloadLaunches();
        await reloadAccounts();
        resetForm(form.startDate);
        globalThis.setTimeout(() => descriptionInputRef.current?.focus(), 0);
      })
      .catch((err) => {
        console.error("Erro ao criar despesa:", err);
        const errorMsg = err?.response?.data?.message || err?.message || "Erro ao criar despesa";
        setSubmitError(errorMsg);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function resetForm(preservedStartDate: string) {
    setForm({
      description: "",
      value: "",
      category: "",
      account: selectedSidebarAccountId,
      startDate: preservedStartDate,
      installmentFrom: 1,
      installmentTo: 1,
      recurrence: "monthly",
      hasEndDate: false,
      endDate: "",
    });
    setErrors({});
    setSubmitError("");
    setType("single");
  }

  async function handleCreateCategory(data: { name: string; parentId?: string | null }) {
    try {
      const created = await createCategory(data);
      addCategory(created);
      await reloadCategories();
      setShowCategoryModal(false);
      setForm(prev => ({ ...prev, category: created.id }));
    } catch (err) {
      console.error(err);
      alert("Erro ao criar categoria");
    }
  }

  async function handleCreateAccount(data: { name: string; initialBalance: number }) {
    try {
      const { createAccount } = await import("../../services/accountService");
      const created = await createAccount(data);
      addAccount(created);
      await reloadAccounts();
      setShowAccountModal(false);
      setForm(prev => ({ ...prev, account: created.id }));
    } catch (err) {
      console.error(err);
      alert("Erro ao criar conta");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Nova Despesa"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
        </>
      }
    >
      {submitError && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          border: '1px solid #ef5350'
        }}>
          <strong>Erro:</strong> {submitError}
        </div>
      )}

      {/* CAMPOS BASE */}
      <div className="expense-section">
        
        <Input
            label="Data Lançamento"
            autoFocus
            type="date"
            value={form.startDate}
            error={errors.startDate}
            onChange={e => {
            const v = e.target.value;
            setForm({ ...form, startDate: v });
            validateField("startDate", v);
            }}
        />

        <Input
          label="Descrição"
          inputRef={descriptionInputRef}
          value={form.description}
          error={errors.description}          
          onChange={e => {
            const v = e.target.value;
            setForm({ ...form, description: v });
            validateField("description", v);
          }}
        />

        <Input
          label="Valor"
          value={form.value}
          error={errors.value}
          onChange={e => {
            const v = e.target.value;
            setForm({ ...form, value: v });
            validateField("value", v);
          }}
        />

        {/* CATEGORIA */}
        <div className="input-group">
          <div className="category-inline-actions expense-inline-actions">
            <SearchableSelect
              label="Categoria"
              items={sortCategoriesHierarchically(categories)}
              selectedValue={form.category}
              onSelect={v => {
                setForm({ ...form, category: v });
                validateField("category", v);
              }}
              getLabel={(c) => {
                const parent = categories.find((p) => p.id === c.parentId);
                return parent ? `${parent.name} › ${c.name}` : c.name;
              }}
              getId={(c) => c.id}
              placeholder="Buscar categoria..."
            />
            <button
              type="button"
              className="btn-small"
              title="Nova categoria"
              onClick={() => setShowCategoryModal(true)}
            >
              +
            </button>
          </div>
          {errors.category && <span className="input-error">{errors.category}</span>}
        </div>

        {/* CONTA */}
        <div className="input-group">
            <div className="category-inline-actions expense-inline-actions">
              <SearchableSelect
                label="Conta"
                items={accounts}
                selectedValue={form.account}
                onSelect={v => {
                  setForm({ ...form, account: v });
                  validateField("account", v);
                }}
                getLabel={(a) => a.name}
                getId={(a) => a.id}
                placeholder="Buscar conta..."
              />
              <button type="button" className="btn-small" onClick={() => setShowAccountModal(true)}>+</button>
            </div>
            {errors.account && (
            <span className="input-error">{errors.account}</span>
            )}
        </div>
        
      </div>

      {/* TIPO */}
      <div className="expense-section">
        <fieldset className="section-label">
          <legend>Tipo de lançamento</legend>
          <div className="radio-group">
            <label htmlFor="type-single">
              <input id="type-single" type="radio" checked={type === "single"} onChange={() => changeType("single")} />
              {" "}
              Lançamento único
            </label>
            <label htmlFor="type-installment">
              <input id="type-installment" type="radio" checked={type === "installment"} onChange={() => changeType("installment")} />
              {" "}
              Parcelado
            </label>
            <label htmlFor="type-recurring">
              <input id="type-recurring" type="radio" checked={type === "recurring"} onChange={() => changeType("recurring")} />
              {" "}
              Recorrente
            </label>
          </div>
        </fieldset>
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="expense-section">
          <fieldset className="section-label">
            <legend>Parcelamento</legend>
            <div className="installment-group">
              <Input
                label="De"
                value={String(form.installmentFrom)}
                onChange={e =>
                  setForm({ ...form, installmentFrom: Number(e.target.value) })
                }
              />
              <Input
                label="Até"
                value={String(form.installmentTo)}
                error={errors.installmentTo}
                onChange={e => {
                  const v = Number(e.target.value);
                  setForm({ ...form, installmentTo: v });
                  if (v < form.installmentFrom || v <= 1) {
                    setErrors(prev => ({ ...prev, installmentTo: "Parcela inválida" }));
                  } else {
                    setErrors(prev => {
                      const n = { ...prev };
                      delete n.installmentTo;
                      return n;
                    });
                  }
                }}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* RECORRÊNCIA */}
      {type === "recurring" && (
        <div className="expense-section">
          <fieldset className="section-label">
            <legend>Recorrência</legend>
            <select
              className="expense-select"
              value={form.recurrence}
              onChange={e => {
                const value = e.target.value as RecurrenceType;
                setForm({ ...form, recurrence: value });
              }}
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
              <option value="indefinite">Indefinido</option>
            </select>

            <label htmlFor="has-end-date" className="checkbox-group">
              <input
                id="has-end-date"
                type="checkbox"
                checked={form.hasEndDate}
                onChange={e =>
                  setForm({
                    ...form,
                    hasEndDate: e.target.checked,
                    endDate: e.target.checked ? form.endDate : "",
                  })
                }
              />
              {" "}
              Definir data final
            </label>

            {form.hasEndDate && (
              <Input
                label="Data final"
                type="date"
                value={form.endDate}
                error={errors.endDate}
                onChange={e => {
                  const v = e.target.value;
                  setForm({ ...form, endDate: v });
                  validateField("endDate", v);
                }}
              />
            )}
          </fieldset>
        </div>
      )}
      {showAccountModal && (
        <AccountModal
          account={null}
          onClose={() => setShowAccountModal(false)}
          onSave={handleCreateAccount}
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          category={null}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleCreateCategory}
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          category={null}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleCreateCategory}
        />
      )}
    </Modal>
  );
}
