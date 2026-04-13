import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useKeywords } from "../../contexts/keywords/useKeywords";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { createCategory } from "../../services/categoryService";
import {
  completeFailedTransaction,
  createTransaction,
} from "../../services/launchService";
import {
  formatBRLInputSigned,
  maskBRLInput,
  parseBRL,
} from "../../utils/currency";
import {
  sortAccountsAlphabetically,
  sortCategoriesHierarchically,
} from "../../utils/sortUtils";
import AccountModal from "../accounts/components/AccountModal";
import CategoryModal from "../categories/CategoryModal";
import type {
  FailedTransactionRow,
  FailedTransactionType,
} from "./types";
import "./FailedTransactionsModal.css";
import { findKeywordMatch } from "./keywordMatcher";

type ResolveFailedTransactionModalProps = {
  failedTransaction: FailedTransactionRow;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (id: string) => void;
};

export default function ResolveFailedTransactionModal({
  failedTransaction,
  isOpen,
  onClose,
  onResolved,
}: Readonly<ResolveFailedTransactionModalProps>) {
  const { accounts, addAccount, reloadAccounts } = useAccounts();
  const { categories, addCategory, reloadCategories } = useCategories();
  const { keywords, upsertKeyword } = useKeywords();
  const { reloadLaunches } = useLaunches();
  const [type, setType] = useState<FailedTransactionType>(failedTransaction.type);
  const [date, setDate] = useState(failedTransaction.date);
  const [description, setDescription] = useState(failedTransaction.description);
  const [value, setValue] = useState(formatBRLInputSigned(failedTransaction.value));
  const [categoryId, setCategoryId] = useState(failedTransaction.category?.id ?? "");
  const [accountId, setAccountId] = useState(failedTransaction.account?.id ?? "");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    setType(failedTransaction.type);
    setDate(failedTransaction.date);
    setDescription(failedTransaction.description);
    setValue(formatBRLInputSigned(failedTransaction.value));
    setCategoryId(failedTransaction.category?.id ?? "");
    setAccountId(failedTransaction.account?.id ?? "");
    setSubmitError("");
  }, [failedTransaction]);

  const sortedAccounts = useMemo(
    () => sortAccountsAlphabetically(accounts),
    [accounts],
  );
  const sortedCategories = useMemo(
    () => sortCategoriesHierarchically(categories),
    [categories],
  );
  const dateIsInvalid = date.length === 0;
  const descriptionIsInvalid = description.trim().length === 0;
  const valueIsInvalid = parseBRL(value) <= 0;

  function isValid(): boolean {
    return !!date && !!description.trim() && parseBRL(value) > 0 && !!categoryId && !!accountId;
  }

  async function handleSave() {
    if (!isValid() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createTransaction({
        type,
        description: description.trim(),
        value: parseBRL(value),
        categoryId,
        accountId,
        startDate: date,
        occurrenceType: "single",
      });
      await persistKeyword();
      await completeFailedTransaction(failedTransaction.id);
      await reloadLaunches();
      await reloadAccounts();
      onResolved(failedTransaction.id);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar lançamento pendente:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : "Erro ao salvar lançamento pendente");
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function persistKeyword() {
    const keyword = description.trim();
    const selectedCategory = categories.find((category) => category.id === categoryId);
    const selectedAccount = accounts.find((account) => account.id === accountId);

    if (!keyword || !selectedCategory || !selectedAccount) {
      return;
    }

    try {
      await upsertKeyword({
        keyword,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
      });
    } catch (error) {
      console.error("Erro ao salvar keyword do lançamento pendente:", error);
    }
  }

  function handleDescriptionChange(nextDescription: string) {
    setDescription(nextDescription);

    const matchedKeyword = findKeywordMatch(keywords, nextDescription);
    if (!matchedKeyword) {
      return;
    }

    setCategoryId(matchedKeyword.categoryId);
    setAccountId(matchedKeyword.accountId);
  }

  async function handleCreateCategory(data: { name: string; parentId?: string | null }) {
    try {
      const created = await createCategory(data);
      addCategory(created);
      await reloadCategories();
      setCategoryId(created.id);
      setShowCategoryModal(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar categoria");
    }
  }

  async function handleCreateAccount(data: { name: string; initialBalance: number }) {
    try {
      const { createAccount } = await import("../../services/accountService");
      const created = await createAccount(data);
      addAccount(created);
      await reloadAccounts();
      setAccountId(created.id);
      setShowAccountModal(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar conta");
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Revisar lançamento pendente"
        titleTone={type === "expense" ? "expense" : "revenue"}
        onClose={onClose}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={!isValid() || isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </>
        }
      >
        <div className="failed-transaction-form">
          {submitError && (
            <div className="failed-transactions-error-banner">
              <strong>Erro:</strong> {submitError}
            </div>
          )}

          <div className="failed-transaction-tags" role="tablist" aria-label="Tipo do lançamento">
            <button
              type="button"
              className={`failed-transaction-tag expense ${type === "expense" ? "active" : ""}`}
              onClick={() => setType("expense")}
            >
              Despesa
            </button>
            <button
              type="button"
              className={`failed-transaction-tag income ${type === "income" ? "active" : ""}`}
              onClick={() => setType("income")}
            >
              Receita
            </button>
          </div>

          <div className="failed-transaction-source-card">
            <span className="failed-transaction-source-label">Mensagem original do WhatsApp</span>
            <p>{failedTransaction.rawMessage}</p>
          </div>

          <div className="failed-transaction-form-grid">
            <Input
              label="Data"
              type="date"
              className={dateIsInvalid ? "invalid" : undefined}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />

            <Input
              label="Descrição"
              className={descriptionIsInvalid ? "invalid" : undefined}
              value={description}
              onChange={(event) => handleDescriptionChange(event.target.value)}
            />

            <div className="failed-transaction-inline-action">
              <SearchableSelect
                label="Categoria"
                items={sortedCategories}
                selectedValue={categoryId}
                onSelect={setCategoryId}
                getLabel={(category) => {
                  const parent = categories.find((item) => item.id === category.parentId);
                  return parent ? `${parent.name} › ${category.name}` : category.name;
                }}
                getId={(category) => category.id}
                placeholder="Buscar categoria..."
              />
              <button
                type="button"
                className="failed-transaction-add-button"
                onClick={() => setShowCategoryModal(true)}
                aria-label="Criar categoria"
              >
                +
              </button>
            </div>

            <div className="failed-transaction-inline-action">
              <SearchableSelect
                label="Conta"
                items={sortedAccounts}
                selectedValue={accountId}
                onSelect={setAccountId}
                getLabel={(account) => account.name}
                getId={(account) => account.id}
                placeholder="Buscar conta..."
              />
              <button
                type="button"
                className="failed-transaction-add-button"
                onClick={() => setShowAccountModal(true)}
                aria-label="Criar conta"
              >
                +
              </button>
            </div>

            <Input
              label="Valor"
              className={valueIsInvalid ? "invalid" : undefined}
              value={value}
              onChange={(event) => setValue(maskBRLInput(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {showAccountModal && (
        <AccountModal
          account={null}
          onClose={() => setShowAccountModal(false)}
          onSave={(data) => void handleCreateAccount(data)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={null}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSave={(data) => void handleCreateCategory(data)}
        />
      )}
    </>
  );
}