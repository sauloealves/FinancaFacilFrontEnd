import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";
import "./RevenueModal.css";

type RevenueModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LaunchType = "single" | "installment" | "recurring";

export default function RevenueModal({
  isOpen,
  onClose,
}: Readonly<RevenueModalProps>) {
    const [type, setType] = useState<LaunchType>("single");
    type FormErrors = Partial<Record<keyof typeof form, string>>;
    const [errors, setErrors] = useState<FormErrors>({});

    const [form, setForm] = useState({
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
        field: keyof typeof form,
        value: string | number | boolean
        ) {
        let message = "";

        switch (field) {
            case "description":
            if (!String(value).trim()) {
                message = "Descrição é obrigatória";
            }
            break;

            case "value":
            if (!value || Number(value) <= 0) {
                message = "Informe um valor válido";
            }
            break;

            case "account":
            if (!value) {
                message = "Selecione uma conta";
            }

            case "category":
            if (!value) {
                message = "Selecione uma categoria";
            }
            break;

            case "startDate":
            if (!value) {
                message = "Data inicial é obrigatória";
            }
            break;

            case "endDate":
            if (form.hasEndDate) {
                if (!value) {
                message = "Data final é obrigatória";
                } else if (String(value) <= form.startDate) {
                message = "Data final deve ser maior que a data inicial";
                }
            }
            break;
        }

        setErrors(prev => {
            const next = { ...prev };

            if (message) {
            next[field] = message;
            } else {
            delete next[field]; 
            }

            return next;
        });
    }

    function changeType(newType: LaunchType) {
        setType(newType);
        setErrors({});
    }

    function handleSubmit() {
        if (validate()) {
        console.log({ type, form });
        onClose();
        }
    }

  return (
    <Modal
      isOpen={isOpen}
      title="Nova Receita"
      onClose={onClose}
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
            <label>Categoria</label>
            <select
                className={`revenue-select ${errors.category ? "error" : ""}`}
                value={form.category}
                onChange={e => {
                    const value = e.target.value;
                    setForm({ ...form, category: value });
                    validateField("category", value);
                }}
            >
                <option value="">Selecione uma categoria</option>
                <option value="salary">Salário</option>
                <option value="extra">Renda Extra</option>
                <option value="investment">Investimentos</option>
                <option value="other">Outros</option>
            </select>
            {errors.category && (
                <span className="input-error">{errors.category}</span>
            )}
        </div>

        {/* CONTA */}
        <div className="input-group">
            <label>Conta</label>
            <select
            className={`revenue-select ${errors.account ? "error" : ""}`}
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
            <option value="investment">Conta Investimento</option>
            </select>
            {errors.account && (
            <span className="input-error">{errors.account}</span>
            )}
        </div>

        <Input
          label="Data Lançamento"
          type="date"
          value={form.startDate}
          error={errors.startDate}
          onChange={e => {
            const value = e.target.value;
            setForm({ ...form, startDate: value });
            validateField("startDate", value);
          }}
        />
      </div>

      {/* TIPO DE LANÇAMENTO */}
      <div className="revenue-section">
        <label className="section-label">Tipo de lançamento</label>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={type === "single"}
              onChange={() => setType("single")}
            />
            Lançamento único
          </label>

          <label>
            <input
              type="radio"
              checked={type === "installment"}
              onChange={() => setType("installment")}
            />
            Parcelado
          </label>

          <label>
            <input
              type="radio"
              checked={type === "recurring"}
              onChange={() => setType("recurring")}
            />
            Recorrente
          </label>
        </div>
      </div>

      {/* PARCELAMENTO */}
      {type === "installment" && (
        <div className="revenue-section">
          <label className="section-label">Parcelamento</label>

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
            <label className="section-label">Recorrência</label>

            {/* FREQUÊNCIA */}
            <select
            className="revenue-select"
            value={form.recurrence}
            onChange={e =>
                setForm({ ...form, recurrence: e.target.value })
            }
            >
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quinzenal</option>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
            <option value="indefinite">Indefinido</option>
            </select>

            {/* DATA FINAL */}
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
                onChange={e =>
                setForm({ ...form, endDate: e.target.value })
                }
            />
            )}
        </div>
    )}

    </Modal>
  );
}
