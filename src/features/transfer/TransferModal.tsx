import { useEffect, useRef, useState } from "react";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { useAccountFilter } from "../../contexts/AccountFilterContext";
import { Modal, Input, Button } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import AccountModal from "../accounts/components/AccountModal";
import CategoryModal from "../categories/CategoryModal";
import { createCategory } from "../../services/categoryService";
import { createTransaction } from "../../services/launchService";
import { parseBRL } from "../../utils/currency";
import "./TransferModal.css";

type TransferModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LaunchType = "single" | "installment" | "recurring";

type RecurrenceType = "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";

type FormState = {
  description: string;
  value: string;
  fromAccount: string;
  toAccount: string;
  category: string;
  startDate: string;

  installmentFrom: number;
  installmentTo: number;

  recurrence: RecurrenceType;
  hasEndDate: boolean;
  endDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function TransferModal({ isOpen, onClose }: Readonly<TransferModalProps>) {
  const { accounts, addAccount, reloadAccounts } = useAccounts();
  const { categories, addCategory, reloadCategories } = useCategories();
  const { reloadLaunches } = useLaunches();
  const { selectedAccounts } = useAccountFilter();
  const [type, setType] = useState<LaunchType>("single");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountTarget, setAccountTarget] = useState<"from" | "to" | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const selectedSidebarAccountId =
    selectedAccounts.find(id => accounts.some(account => account.id === id)) ?? "";

  const [form, setForm] = useState<FormState>({
    description: "",
    value: "",
    category: "",
    fromAccount: "",
    toAccount: selectedSidebarAccountId,
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
      toAccount: selectedSidebarAccountId,
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
    if (!form.fromAccount) e.fromAccount = "Selecione a conta origem";
    if (!form.toAccount) e.toAccount = "Selecione a conta destino";
    if (form.fromAccount && form.toAccount && form.fromAccount === form.toAccount) {
      e.toAccount = "Conta destino deve ser diferente da origem";
    }
    if (!form.startDate) e.startDate = "Data inicial é obrigatória";

    if (type === "installment") {
      if (form.installmentTo < form.installmentFrom || form.installmentTo <= 1) {
        e.installmentTo = "Parcelamento inválido";
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

  function handleSubmit() {
    if (!validate()) return;

    setSubmitError("");

    const transfer = {
      type: "transfer" as const,
      description: form.description.trim(),
      value: parseBRL(form.value),
      fromAccountId: form.fromAccount,
      toAccountId: form.toAccount,
      ...(form.category && { categoryId: form.category }),
      startDate: form.startDate,
      occurrenceType: type,
      ...(type === "installment" && {
        installmentFrom: form.installmentFrom,
        installmentTo: form.installmentTo,
      }),
      ...(type === "recurring" && {
        recurrence: form.recurrence as any,
        endDate: form.hasEndDate ? form.endDate : null,
      }),
    };

    createTransaction(transfer)
      .then(async () => {
        await reloadLaunches();
        await reloadAccounts();
        resetForm(form.startDate);
        globalThis.setTimeout(() => descriptionInputRef.current?.focus(), 0);
      })
      .catch((err) => {
        console.error("Erro ao criar transferência:", err);
        const errorMsg = err?.response?.data?.message || err?.message || "Erro ao criar transferência";
        setSubmitError(errorMsg);
      });
  }

  function resetForm(preservedStartDate: string) {
    setForm({
      description: "",
      value: "",
      category: "",
      fromAccount: "",
      toAccount: selectedSidebarAccountId,
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
      if (accountTarget === 'from') setForm(prev => ({ ...prev, fromAccount: created.id }));
      if (accountTarget === 'to') setForm(prev => ({ ...prev, toAccount: created.id }));
      setAccountTarget(null);
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
      title="Transferência entre contas"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
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
      <div className="transfer-section">
        <Input
          label="Descrição"
          value={form.description}
          error={errors.description}
          autoFocus
          inputRef={descriptionInputRef}
          onChange={e => {
            const v = e.target.value;
            setForm({ ...form, description: v });
          }}
        />

        <Input
          label="Valor"
          value={form.value}
          error={errors.value}
          onChange={e => {
            const v = e.target.value;
            setForm({ ...form, value: v });
          }}
        />

        {/* CONTA ORIGEM */}
        <div className="input-group">
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <SearchableSelect
              label="Conta origem"
              items={accounts}
              selectedValue={form.fromAccount}
              onSelect={v => setForm({ ...form, fromAccount: v })}
              getLabel={(a) => a.name}
              getId={(a) => a.id}
              placeholder="Buscar conta..."
            />
            <button type="button" className="btn-small" onClick={() => { setAccountTarget('from'); setShowAccountModal(true); }}>+</button>
          </div>
          {errors.fromAccount && <span className="input-error">{errors.fromAccount}</span>}
        </div>

        {/* CONTA DESTINO */}
        <div className="input-group">
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <SearchableSelect
              label="Conta destino"
              items={accounts}
              selectedValue={form.toAccount}
              onSelect={v => setForm({ ...form, toAccount: v })}
              getLabel={(a) => a.name}
              getId={(a) => a.id}
              placeholder="Buscar conta..."
            />
            <button type="button" className="btn-small" onClick={() => { setAccountTarget('to'); setShowAccountModal(true); }}>+</button>
          </div>
          {errors.toAccount && <span className="input-error">{errors.toAccount}</span>}
        </div>

        <Input
          label="Data inicial"
          type="date"
          value={form.startDate}
          error={errors.startDate}
          onChange={e => setForm({ ...form, startDate: e.target.value })}
        />
      </div>

      {/* TIPO */}
      <div className="transfer-section">
        <fieldset className="section-label">
          <legend>Tipo</legend>
          <div className="radio-group">
            <label htmlFor="transfer-type-single">
              <input id="transfer-type-single" type="radio" checked={type === "single"} onChange={() => changeType("single")} />
              {" "}
              Único
            </label>
            <label htmlFor="transfer-type-installment">
              <input id="transfer-type-installment" type="radio" checked={type === "installment"} onChange={() => changeType("installment")} />
              {" "}
              Parcelado
            </label>
            <label htmlFor="transfer-type-recurring">
              <input id="transfer-type-recurring" type="radio" checked={type === "recurring"} onChange={() => changeType("recurring")} />
              {" "}
              Recorrente
            </label>
          </div>
        </fieldset>
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="transfer-section installment-group">
          <Input
            label="De"
            value={String(form.installmentFrom)}
            onChange={e => setForm({ ...form, installmentFrom: Number(e.target.value) })}
          />
          <Input
            label="Até"
            value={String(form.installmentTo)}
            error={errors.installmentTo}
            onChange={e => setForm({ ...form, installmentTo: Number(e.target.value) })}
          />
        </div>
      )}

      {/* RECORRÊNCIA */}
      {type === "recurring" && (
        <div className="transfer-section">
          <fieldset className="section-label">
            <legend>Recorrência</legend>
            <select
              className="transfer-select"
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

            <label htmlFor="transfer-has-end-date" className="checkbox-group">
              <input
                id="transfer-has-end-date"
                type="checkbox"
                checked={form.hasEndDate}
                onChange={e =>
                  setForm({ ...form, hasEndDate: e.target.checked, endDate: "" })
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
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            )}
          </fieldset>
        </div>
      )}
      {showAccountModal && (
        <AccountModal
          account={null}
          onClose={() => { setShowAccountModal(false); setAccountTarget(null); }}
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
    </Modal>
  );
}
