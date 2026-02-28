import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";
//import "./ExpenseModal.css";

type ExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LaunchType = "single" | "installment" | "recurring";

type FormState = {
  description: string;
  value: string;
  category: string;
  account: string;
  startDate: string;

  installmentFrom: number;
  installmentTo: number;

  recurrence: "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";
  hasEndDate: boolean;
  endDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function ExpenseModal({ isOpen, onClose }: ExpenseModalProps) {
  const [type, setType] = useState<LaunchType>("single");
  const [errors, setErrors] = useState<FormErrors>({});

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

  function changeType(newType: LaunchType) {
    setType(newType);
    setErrors({});
  }

  function validate(): boolean {
    const e: FormErrors = {};

    if (!form.description.trim()) e.description = "Descrição é obrigatória";
    if (!form.value || Number(form.value) <= 0) e.value = "Informe um valor válido";
    if (!form.category) e.category = "Selecione uma categoria";
    if (!form.startDate) e.startDate = "Data inicial é obrigatória";
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

  function validateField(field: keyof FormState, value: any) {
    let message = "";

    switch (field) {
      case "description":
        if (!String(value).trim()) message = "Descrição é obrigatória";
        break;
      case "value":
        if (!value || Number(value) <= 0) message = "Informe um valor válido";
        break;
      case "category":
        if (!value) message = "Selecione uma categoria";
        break;
      case "account":
        if (!value) message = "Selecione uma conta";
        break;
      case "startDate":
        if (!value) message = "Data inicial é obrigatória";
        break;
      case "endDate":
        if (form.hasEndDate) {
          if (!value) message = "Data final é obrigatória";
          else if (value <= form.startDate)
            message = "Data final deve ser maior que a data inicial";
        }
        break;
    }

    setErrors(prev => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function handleSubmit() {
    if (!validate()) return;

    // Payload pronto para API
    console.log({
      kind: "expense",
      type,
      ...form,
      value: Number(form.value),
      endDate: form.hasEndDate ? form.endDate : null,
    });

    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Nova Despesa"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </>
      }
    >
      {/* CAMPOS BASE */}
      <div className="expense-section">
        <Input
          label="Descrição"
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
          <label>Categoria</label>
          <select
            className={`expense-select ${errors.category ? "error" : ""}`}
            value={form.category}
            onChange={e => {
              const v = e.target.value;
              setForm({ ...form, category: v });
              validateField("category", v);
            }}
          >
            <option value="">Selecione uma categoria</option>
            <option value="food">Alimentação</option>
            <option value="housing">Moradia</option>
            <option value="transport">Transporte</option>
            <option value="health">Saúde</option>
            <option value="education">Educação</option>
            <option value="leisure">Lazer</option>
            <option value="other">Outros</option>
          </select>
          {errors.category && <span className="input-error">{errors.category}</span>}
        </div>

        {/* CONTA */}
        <div className="input-group">
            <label>Conta</label>
            <select
            className={`expense-select ${errors.account ? "error" : ""}`}
            value={form.account}
            onChange={e => {
                const v = e.target.value;
                setForm({ ...form, account: v });
                validateField("account", v);
            }}
            >
            <option value="">Selecione uma conta</option>
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="wallet">Carteira</option>
            <option value="credit">Conta Crédito</option>
            </select>
            {errors.account && (
            <span className="input-error">{errors.account}</span>
            )}
        </div>

        <Input
            label="Data inicial"
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
          label="Data inicial"
          type="date"
          value={form.startDate}
          error={errors.startDate}
          onChange={e => {
            const v = e.target.value;
            setForm({ ...form, startDate: v });
            validateField("startDate", v);
          }}
        />
      </div>

      {/* TIPO */}
      <div className="expense-section">
        <label className="section-label">Tipo de lançamento</label>
        <div className="radio-group">
          <label>
            <input type="radio" checked={type === "single"} onChange={() => changeType("single")} />
            Lançamento único
          </label>
          <label>
            <input type="radio" checked={type === "installment"} onChange={() => changeType("installment")} />
            Parcelado
          </label>
          <label>
            <input type="radio" checked={type === "recurring"} onChange={() => changeType("recurring")} />
            Recorrente
          </label>
        </div>
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="expense-section">
          <label className="section-label">Parcelamento</label>
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
        </div>
      )}

      {/* RECORRÊNCIA */}
      {type === "recurring" && (
        <div className="expense-section">
          <label className="section-label">Recorrência</label>

          <select
            className="expense-select"
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
                setForm({
                  ...form,
                  hasEndDate: e.target.checked,
                  endDate: e.target.checked ? form.endDate : "",
                })
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
              onChange={e => {
                const v = e.target.value;
                setForm({ ...form, endDate: v });
                validateField("endDate", v);
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
