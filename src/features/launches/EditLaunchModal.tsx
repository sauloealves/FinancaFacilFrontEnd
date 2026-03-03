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
        const updated: LaunchRow = {
            ...launch,
            type,
            date,
            description,
            value: parseBRL(value),
        };

        if (isTransactionType(type, "transfer")) {
            updated.account = undefined;
            updated.category = undefined;
            const fa = accounts.find((a) => a.id === fromAccount);
            const ta = accounts.find((a) => a.id === toAccount);
            updated.fromAccount = { id: fromAccount, name: fa?.name ?? "" };
            updated.toAccount = { id: toAccount, name: ta?.name ?? "" };
        } else {
            updated.fromAccount = undefined;
            updated.toAccount = undefined;
            const acc = accounts.find((a) => a.id === accountId);
            updated.account = { id: accountId, name: acc?.name ?? "" };
            const cat = categories.find((c) => c.id === categoryId);
            updated.category = { id: categoryId, name: cat?.name ?? "" };
        }

        onSave(updated);
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
                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
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

                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
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
                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
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

                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
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
                            <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
                                <button type="button" className="btn-small" onClick={() => setShowCategoryModal(true)}>+</button>
                            </div>
                        </>
                    )}

                    <Input
                        label="Valor"
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
