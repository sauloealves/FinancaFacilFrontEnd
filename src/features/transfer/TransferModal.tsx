import { useState } from "react";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { Modal, Input, Button } from "../../components/ui";
import AccountModal from "../accounts/components/AccountModal";
import CategoryModal from "../categories/CategoryModal";
import { createCategory } from "../../services/categoryService";
import "./TransferModal.css";

type TransferModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LaunchType = "single" | "installment" | "recurring";

type FormState = {
  description: string;
  value: string;
  fromAccount: string;
  toAccount: string;
  category: string;
  startDate: string;

  installmentFrom: number;
  installmentTo: number;

  recurrence: "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";
  hasEndDate: boolean;
  endDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { accounts, addAccount, reloadAccounts } = useAccounts();
  const { categories, addCategory, reloadCategories } = useCategories();
  const [type, setType] = useState<LaunchType>("single");
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountTarget, setAccountTarget] = useState<"from" | "to" | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [form, setForm] = useState<FormState>({
    description: "",
    value: "",
    category: "",
    fromAccount: "",
    toAccount: "",
    startDate: "",
    installmentFrom: 1,
    installmentTo: 1,
    recurrence: "monthly",
    hasEndDate: false,
    endDate: "",
  });

  function changeType(newType: LaunchType) {
    setType(newType);
    setErrors({});
  }

  function validate(): boolean {
    const e: FormErrors = {};

    if (!form.description.trim()) e.description = "Descrição é obrigatória";
    if (!form.value || Number(form.value) <= 0) e.value = "Informe um valor válido";
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

    console.log({
      kind: "transfer",
      type,
      ...form,
      value: Number(form.value),
      endDate: form.hasEndDate ? form.endDate : null,
    });

    onClose();
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </>
      }
    >
      {/* CAMPOS BASE */}
      <div className="transfer-section">
        <Input
          label="Descrição"
          value={form.description}
          error={errors.description}
          autoFocus
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
          <label>Conta origem</label>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <select
            className={`transfer-select ${errors.fromAccount ? "error" : ""}`}
            value={form.fromAccount}
            onChange={e => setForm({ ...form, fromAccount: e.target.value })}
          >
            <option value="">Selecione</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button type="button" className="btn-small" onClick={() => { setAccountTarget('from'); setShowAccountModal(true); }}>+</button>
          </div>
          {errors.fromAccount && <span className="input-error">{errors.fromAccount}</span>}
        </div>

        {/* CONTA DESTINO */}
        <div className="input-group">
          <label>Conta destino</label>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <select
            className={`transfer-select ${errors.toAccount ? "error" : ""}`}
            value={form.toAccount}
            onChange={e => setForm({ ...form, toAccount: e.target.value })}
          >
            <option value="">Selecione</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
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
        <label className="section-label">Tipo</label>
        <div className="radio-group">
          <label><input type="radio" checked={type === "single"} onChange={() => changeType("single")} /> Único</label>
          <label><input type="radio" checked={type === "installment"} onChange={() => changeType("installment")} /> Parcelado</label>
          <label><input type="radio" checked={type === "recurring"} onChange={() => changeType("recurring")} /> Recorrente</label>
        </div>
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
          <label className="section-label">Recorrência</label>

          <select
            className="transfer-select"
            value={form.recurrence}
            onChange={e => setForm({ ...form, recurrence: e.target.value as any })}
          >
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quinzenal</option>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
            <option value="indefinite">Indefinido</option>
          </select>

          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={form.hasEndDate}
              onChange={e =>
                setForm({ ...form, hasEndDate: e.target.checked, endDate: "" })
              }
            />
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
