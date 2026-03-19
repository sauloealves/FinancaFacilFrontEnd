import { useEffect, useState, useRef } from "react";
import "./EditLaunchModal.css";
import type { LaunchRow } from "./types";

import { useCategories } from "../../contexts/categories/useCategories";
import { createCategory } from "../../services/categoryService";
import CategoryModal from "../categories/CategoryModal";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import { formatBRLInputSigned, maskBRLInput, parseBRL } from "../../utils/currency";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import AccountModal from "../accounts/components/AccountModal";
import { isTransactionType } from "../../utils/sortUtils";
import { Input } from "../../components/ui";
import { updateLaunch as updateLaunchAPI } from "../../services/launchService";


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
    const [submitError, setSubmitError] = useState<string>("");
    const { categories, addCategory, reloadCategories } = useCategories();
    const { accounts, addAccount, reloadAccounts } = useAccounts();
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

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

    useEffect(() => {
        // keep compatibility if needed; accounts come from context
    }, []);

    function handleSave() {
        const numericValue = parseBRL(value);

        setSubmitError("");

        const payload: any = {
            transactionId: launch.id,
            description,
            value: numericValue,
            startDate: date,
            type,
            occurrenceType: "Single",
        };

        if (isTransactionType(type, "transfer")) {
            payload.fromAccountId = fromAccount;
            payload.toAccountId = toAccount;
        } else {
            payload.accountId = accountId;
            payload.categoryId = categoryId;
        }

        updateLaunchAPI(launch.id, payload)
            .then((result) => {
                onSave(result);
            })
            .catch((err) => {
                console.error("Erro ao atualizar lançamento:", err);
                const errorMsg = err?.response?.data?.message || err?.message || "Erro ao atualizar lançamento";
                setSubmitError(errorMsg);
            });
    }

    function isValid(): boolean {
        const numericValue = parseBRL(value);

        if (!date) return false;
        if (!description.trim()) return false;
        if (!numericValue || numericValue === 0) return false;

        if (isTransactionType(type, "transfer")) {
            if (!fromAccount || !toAccount) return false;
            if (fromAccount === toAccount) return false;
            return true;
        }

        if (!categoryId) return false;
        if (!accountId) return false;

        return true;
    }

    const valid = isValid();

    async function handleCreateCategory(data: { name: string; parentId?: string | null }) {
        try {
            const created = await createCategory(data);
            addCategory(created);
            await reloadCategories();
            setShowCategoryModal(false);
        } catch (err) {
            console.error(err);
            alert("Erro ao criar categoria");
        }
    }

    return (
        <div className="modal-overlay"
            onClick={onClose}>
            <div className="modal"
                onClick={e => e.stopPropagation()}
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
                <div className={`form-row ${isTransactionType(type, "transfer") ? "transfer-form-row" : ""}`}>

                    <Input
                    label="Data"
                        className={`field-date ${!date ? "invalid" : ""}`}
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />

                    <Input
                        label="Descrição"
                        className={`field-description ${!description.trim() ? "invalid" : ""}`}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />

                    {type !== "transfer" && (
                        <>
                            <div className="edit-launch-inline-action">
                                <SearchableSelect
                                    label="Categoria"
                                    items={categories}
                                    selectedValue={categoryId}
                                    onSelect={setCategoryId}
                                    getLabel={(c) => {
                                        const parent = categories.find((p) => p.id === c.parentId);
                                        return parent ? `${parent.name} › ${c.name}` : c.name;
                                    }}
                                    getId={(c) => c.id}
                                    placeholder="Buscar categoria..."
                                />
                                <button type="button" className="btn-small" onClick={() => setShowCategoryModal(true)}>+</button>
                            </div>

                            <div className="edit-launch-inline-action">
                                <SearchableSelect
                                    label="Conta"
                                    items={accounts}
                                    selectedValue={accountId}
                                    onSelect={setAccountId}
                                    getLabel={(a) => a.name}
                                    getId={(a) => a.id}
                                    placeholder="Buscar conta..."
                                />
                                <button type="button" className="btn-small" onClick={() => setShowAccountModal(true)}>+</button>
                            </div>
                        </>
                    )}

                    {isTransactionType(type, "transfer") && (
                        <>
                            <div className="edit-launch-inline-action">
                                <SearchableSelect
                                    label="De Conta"
                                    items={accounts}
                                    selectedValue={fromAccount}
                                    onSelect={setFromAccount}
                                    getLabel={(a) => a.name}
                                    getId={(a) => a.id}
                                    placeholder="Buscar conta..."
                                />
                                <button type="button" className="btn-small" onClick={() => setShowAccountModal(true)}>+</button>
                            </div>

                            <div className="edit-launch-inline-action">
                                <SearchableSelect
                                    label="Para Conta"
                                    items={accounts}
                                    selectedValue={toAccount}
                                    onSelect={setToAccount}
                                    getLabel={(a) => a.name}
                                    getId={(a) => a.id}
                                    placeholder="Buscar conta..."
                                />
                                <button type="button" className="btn-small" onClick={() => setShowAccountModal(true)}>+</button>
                            </div>
                        </>
                    )}

                    <Input
                        label="Valor"
                        autoFocus
                        type="text"
                        placeholder="Valor"
                        value={value}                        
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

                {showAccountModal && (
                    <AccountModal
                        account={null}
                        onClose={() => setShowAccountModal(false)}
                        onSave={async (data) => {
                            const { createAccount } = await import("../../services/accountService");
                            const created = await createAccount(data);
                            addAccount(created);
                            await reloadAccounts();
                            setShowAccountModal(false);
                        }}
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

            </div>
        </div>
    );
}
