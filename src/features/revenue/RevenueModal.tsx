import { useState } from "react";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { createCategory } from "../../services/categoryService";
import { createTransaction } from "../../services/launchService";
import CategoryModal from "../categories/CategoryModal";
import AccountModal from "../accounts/components/AccountModal";
import { Modal, Input, Button } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import "./RevenueModal.css";
import { sortAccountsAlphabetically, sortCategoriesHierarchically } from "../../utils/sortUtils";

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
    const [type, setType] = useState<LaunchType>("single");
    const [errors, setErrors] = useState<FormErrors>({});
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

    const [form, setForm] = useState<FormState>({
        description: "",
        value: "",
        category: "",
        account: "",
        startDate: "",
        installmentFrom: 1,
        installmentTo: 1,
        recurrence: "monthly",
        hasEndDate: false,   
        endDate: "",    
    });

    function validate(): boolean {
        const newErrors: FormErrors = {};

        if (!form.description.trim()) {
            newErrors.description = "Descrição é obrigatória";
        }

        if (!form.value || Number(form.value) <= 0) {
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
                return value && Number(value) > 0 ? "" : "Informe um valor válido";
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
        if (!validate()) return;

        const revenue = {
            type: "income" as const,
            description: form.description.trim(),
            value: Number(form.value),
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
                onClose();
                resetForm();
            })
            .catch((err) => {
                console.error(err);
                alert("Erro ao criar receita");
            });
    }

    function resetForm() {
        setForm({
            description: "",
            value: "",
            category: "",
            account: "",
            startDate: "",
            installmentFrom: 1,
            installmentTo: 1,
            recurrence: "monthly",
            hasEndDate: false,
            endDate: "",
        });
        setErrors({});
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
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Salvar
          </Button>
        </>
      }
    >
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
            <div className="category-inline-actions">
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
            <div className="category-inline-actions">
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
        </fieldset>

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
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="revenue-section">
          <fieldset className="section-label">
            <legend>Parcelamento</legend>
          </fieldset>

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
        </div>
      )}

      {/* RECORRÊNCIA */}
      {type === "recurring" && (
        <div className="revenue-section">
          <fieldset className="section-label">
            <legend>Recorrência</legend>
          </fieldset>

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
