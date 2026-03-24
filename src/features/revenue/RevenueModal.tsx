import { useEffect, useRef, useState } from "react";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { useAccountFilter } from "../../contexts/AccountFilterContext";
import { createCategory } from "../../services/categoryService";
import { createTransaction } from "../../services/launchService";
import CategoryModal from "../categories/CategoryModal";
import AccountModal from "../accounts/components/AccountModal";
import { Modal, Input, Button } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import "./RevenueModal.css";
import { sortAccountsAlphabetically, sortCategoriesHierarchically } from "../../utils/sortUtils";
import { parseBRL } from "../../utils/currency";

type RevenueModalProps = {
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

export default function RevenueModal({
  isOpen,
  onClose,
}: Readonly<RevenueModalProps>) {
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

    function validate(): boolean {
        const newErrors: FormErrors = {};

        if (!form.description.trim()) {
            newErrors.description = "Descrição é obrigatória";
        }

        if (!form.value || parseBRL(form.value) <= 0) {
            newErrors.value = "Informe um valor válido";
        }

        if (!form.category) {
            newErrors.category = "Selecione uma categoria";
        }

         if (!form.account) {
            newErrors.account = "Selecione uma conta";
        }

        if (!form.startDate) {
            newErrors.startDate = "Data inicial é obrigatória";
        }

        if (type === "installment") {
            if (form.installmentTo < form.installmentFrom) {
            newErrors.installmentTo = "Parcela final deve ser maior ou igual à inicial";
            }

            if (form.installmentTo <= 1) {
            newErrors.installmentTo = "Parcelamento deve ter mais de 1 parcela";
            }
        }

        if (type === "recurring" && form.hasEndDate) {
            if (!form.endDate) {
                newErrors.endDate = "Data final é obrigatória";
            } else if (form.endDate <= form.startDate) {
                newErrors.endDate = "Data final deve ser maior que a data inicial";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function validateField(
        field: keyof FormState,
        value: unknown
    ): void {
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
                return value ? "" : "Data inicial é obrigatória";
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
      if (!validate() || isSubmitting) {
        return;
      }

      setSubmitError("");
      setIsSubmitting(true);

        const revenue = {
            type: "income" as const,
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

        createTransaction(revenue)
            .then(async () => {
                await reloadLaunches();
                await reloadAccounts();
            resetForm(form.startDate);
            globalThis.setTimeout(() => descriptionInputRef.current?.focus(), 0);
            })
            .catch((err) => {
                console.error("Erro ao criar receita:", err);
                const errorMsg = err?.response?.data?.message || err?.message || "Erro ao criar receita";
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

  return (
    <Modal
      isOpen={isOpen}
      title="Nova Receita"
      titleTone="revenue"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
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
      <div className="revenue-section">
        <Input
          label="Data Lançamento"
          autoFocus
          type="date"
          value={form.startDate}
          error={errors.startDate}
          onChange={e => {
            const value = e.target.value;
            setForm({ ...form, startDate: value });
            validateField("startDate", value);
          }}
        />

        <Input
          label="Descrição"
          inputRef={descriptionInputRef}
          value={form.description}
          error={errors.description}
          onChange={e => {  
            const value = e.target.value;
            setForm({ ...form, description: value });
            validateField("description", value);
          }}
        />

        <Input
          label="Valor"
          value={form.value}
          error={errors.value}
          onChange={e => {
            const value = e.target.value;
            setForm({ ...form, value: value });
            validateField("value", value);
          }}
        />

        {/* CATEGORIA */}
        <div className="input-group">
            <div className="category-inline-actions revenue-inline-actions">
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
            {errors.category && (
                <span className="input-error">{errors.category}</span>
            )}
        </div>

        {/* CONTA */}
        <div className="input-group">
            <div className="category-inline-actions revenue-inline-actions">
              <SearchableSelect
                label="Conta"
                items={sortAccountsAlphabetically(accounts)}
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
            <span className="input-error">
            {errors.account}
            </span>
            )}
          </div>        
      </div>

      {/* TIPO DE LANÇAMENTO */}
      <div className="revenue-section">
        <fieldset className="section-label">
          <legend>Tipo de lançamento</legend>
          <div className="radio-group">
            <label htmlFor="revenue-type-single">
              <input
                id="revenue-type-single"
                type="radio"
                checked={type === "single"}
                onChange={() => setType("single")}
              />
              {" "}
              Lançamento único
            </label>

            <label htmlFor="revenue-type-installment">
              <input
                id="revenue-type-installment"
                type="radio"
                checked={type === "installment"}
                onChange={() => setType("installment")}
              />
              {" "}
              Parcelado
            </label>

            <label htmlFor="revenue-type-recurring">
              <input
                id="revenue-type-recurring"
                type="radio"
                checked={type === "recurring"}
                onChange={() => setType("recurring")}
              />
              {" "}
              Recorrente
            </label>
          </div>
        </fieldset>
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="revenue-section">
          <fieldset className="section-label">
            <legend>Parcelamento</legend>
            <div className="installment-group">
              <Input
                label="De"
                value={String(form.installmentFrom)}
                error={errors.installmentFrom}
                onChange={e =>
                  setForm({
                    ...form,
                    installmentFrom: Number(e.target.value),
                  })
                }
              />

              <Input
                label="Até"
                value={String(form.installmentTo)}
                error={errors.installmentTo}
                onChange={e => {
                      const value = Number(e.target.value);
                      setForm({ ...form, installmentTo: value });

                      if (type === "installment") {
                          if (value < form.installmentFrom) {
                              setErrors(prev => ({
                              ...prev,
                              installmentTo: "Parcela final deve ser maior ou igual à inicial",
                              }));
                          } else {
                              setErrors(prev => {
                              const next = { ...prev };
                              delete next.installmentTo;
                              return next;
                              });
                          }
                      }
                  }}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* RECORRÊNCIA */}
      {type === "recurring" && (
        <div className="revenue-section">
          <fieldset className="section-label">
            <legend>Recorrência</legend>
            <select
              className="revenue-select"
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

            <label htmlFor="revenue-has-end-date" className="checkbox-group">
              <input
                id="revenue-has-end-date"
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
        {showCategoryModal && (
          <CategoryModal
            category={null}
            categories={categories}
            onClose={() => setShowCategoryModal(false)}
            onSave={handleCreateCategory}
          />
        )}
        {showAccountModal && (
          <AccountModal
            account={null}
            onClose={() => setShowAccountModal(false)}
            onSave={handleCreateAccount}
          />
        )}

    </Modal>
  );
}
