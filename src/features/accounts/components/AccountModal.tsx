import { useState, useEffect, useRef } from "react";
import type { Account } from "../types";
import "./AccountModal.css";

type Props = {
    account?: Account | null;
    onClose: () => void;
    onSave: (data: {
        name: string;
        initialBalance: number;
    }) => void;
};

export default function AccountModal({
    account,
    onClose,
    onSave,
}: Props) {
    const [name, setName] = useState("");
    const [initialBalanceInput, setInitialBalanceInput] = useState("0");
    const initialFocusRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        requestAnimationFrame(() => {
            initialFocusRef.current?.focus();
            initialFocusRef.current?.select();
        });
    }, []);

    useEffect(() => {
        if (account) {
            setName(account.name);
            setInitialBalanceInput(String(account.initialBalance));
        }
    }, [account]);

    useEffect(() => {
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

    const parsedInitialBalance = Number(initialBalanceInput);
    const valid =
        name.trim().length > 0 &&
        initialBalanceInput.trim().length > 0 &&
        Number.isFinite(parsedInitialBalance);

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal">

                <h3>
                    {account ? "Editar Conta" : "Nova Conta"}
                </h3>

                <div className="form-row">
                    <div className="form-field">
                        <label>Nome da Conta</label>
                        <input
                            ref={initialFocusRef}
                            type="text"
                            placeholder="Nome da Conta"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-field">
                        <label>Saldo Inicial</label>
                        <input
                            type="number"
                            placeholder="Saldo Inicial"
                            step="any"
                            value={initialBalanceInput}
                            onChange={(e) =>
                                setInitialBalanceInput(e.target.value)
                            }
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-cancelar"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="btn-salvar"
                        disabled={!valid}
                        onClick={() =>
                            onSave({
                                name,
                                initialBalance: parsedInitialBalance,
                            })
                        }
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}