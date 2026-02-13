import { useEffect, useState, useRef } from "react";
import "./EditLaunchModal.css";
import type { LaunchRow } from "./types";
import { formatBRLInputSigned, maskBRLInput, parseBRL } from "../../utils/currency";

type Props = {
  launch: LaunchRow;
  onClose: () => void;
  onSave: (updated: LaunchRow) => void;
};

export default function EditLaunchModal({
  launch,
  onClose,
  onSave,
}: Props) {
    const [type, setType] = useState(launch.type);
    const [date, setDate] = useState(launch.date);
    const [description, setDescription] = useState(launch.description);
    const [value, setValue] = useState(formatBRLInputSigned(launch.value));

    const [categoryId, setCategoryId] = useState(launch.category?.id ?? "");
    const [accountId, setAccountId] = useState(launch.account?.id ?? "");
    const [fromAccount, setFromAccount] = useState(launch.fromAccount?.id ?? "");
    const [toAccount, setToAccount] = useState(launch.toAccount?.id ?? "");

    const valueRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    valueRef.current?.focus();
    valueRef.current?.select();
    console.log("Modal aberto para lançamento", valueRef);
    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
        onClose();
        }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
        window.removeEventListener("keydown", handleKeyDown);
    };
    }, [onClose]);

    function handleSave() {
        const updated: LaunchRow = {
        ...launch,
        type,
        date,
        description,
        value: parseBRL(value),
        };

        if (type === "transfer") {
        updated.account = undefined;
        updated.category = undefined;
        updated.fromAccount = { id: fromAccount, name: "" };
        updated.toAccount = { id: toAccount, name: "" };
        } else {
        updated.fromAccount = undefined;
        updated.toAccount = undefined;
        updated.account = { id: accountId, name: "" };
        updated.category = { id: categoryId, name: "" };
        }

        onSave(updated);
    }

    function isValid(): boolean {
        const numericValue = parseBRL(value);

        if (!date) return false;
        if (!description.trim()) return false;
        if (!numericValue || numericValue === 0) return false;

        if (type === "transfer") {
            if (!fromAccount || !toAccount) return false;
            if (fromAccount === toAccount) return false;
            return true;
        }

        if (!categoryId) return false;
        if (!accountId) return false;

        return true;
    }

    const valid = isValid();

    return (
        <div className="modal-overlay" 
            onClick={onClose}>
        <div className="modal"
            onClick={e => e.stopPropagation()} 
        >

            {/* TAGS */}
            <div className="tags">
            {["expense", "income", "transfer"].map(t => (
                <div
                key={t}
                className={`tag ${t} ${type === t ? "active" : ""}`}
                onClick={() => setType(t as any)}
                >
                {t === "expense" && "Despesa"}
                {t === "income" && "Receita"}
                {t === "transfer" && "Transferência"}
                </div>
            ))}
            </div>

            {/* FORM */}
            <div className="form-row">

            <input
                className={`field-date ${!date ? "invalid" : ""}`}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
            />

            <input
                type="text"
                placeholder="Descrição"
                className={`field-description ${!description.trim() ? "invalid" : ""}`}
                value={description}
                onChange={e => setDescription(e.target.value)}
            />

            {type !== "transfer" && (
                <>
                <select
                    className={`field-category ${type !== "transfer" && !categoryId ? "invalid" : ""}`}
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                >
                    <option value="">Categoria</option>
                    <option value="food">Alimentação</option>
                    <option value="salary">Salário</option>
                </select>

                <select
                    className={`field-account ${type !== "transfer" && !accountId ? "invalid" : ""}`}
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                >
                    <option value="">Conta</option>
                    <option value="cc">Conta Corrente</option>
                    <option value="card">Cartão</option>
                </select>
                </>
            )}

            {type === "transfer" && (
                <>
                <select
                    className={`field-account ${type === "transfer" && (!fromAccount || fromAccount === toAccount)? "invalid": ""}`}
                    value={fromAccount}
                    onChange={e => setFromAccount(e.target.value)}
                >
                    <option value="">De Conta</option>
                    <option value="cc">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                </select>

                <select
                    className={`field-account ${type === "transfer" && (!fromAccount || fromAccount === toAccount)? "invalid": ""}`}
                    value={toAccount}
                    onChange={e => setToAccount(e.target.value)}
                >
                    <option value="">Para Conta</option>
                    <option value="cc">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                </select>
                </>
            )}

            <input
                ref={valueRef}
                type="text"
                placeholder="Valor"
                value={value}
                className={`field-value ${!parseBRL(value) ? "invalid" : ""}`}
                onChange={e => setValue(maskBRLInput(e.target.value))}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();

                    if (valid) {
                        handleSave();
                    }
                    }
                }}
            />

            </div>

            <div className="modal-footer">
            <button className="btn-cancelar" onClick={onClose}>
                Cancelar
            </button>
            <button className="btn-salvar" onClick={handleSave} disabled={!valid}>
                Salvar
            </button>
            </div>

        </div>
        </div>
    );
}
