import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button, Modal } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import { useAccounts } from "../../contexts/accounts/useAccounts";
import { useCategories } from "../../contexts/categories/useCategories";
import { useLaunches } from "../../contexts/launches/useLaunches";
import type { Account } from "../accounts/types";
import type { Category } from "../categories/types";
import { createAccount, getAccounts } from "../../services/accountService";
import { createCategory, getCategories } from "../../services/categoryService";
import { importInvoiceDocument, type ImportedInvoiceItem } from "../../services/invoiceService";
import {
  importTransactionsBatch,
  type CreateTransactionPayload,
} from "../../services/launchService";
import {
  formatBRLInput,
  formatBRLInputSigned,
} from "../../utils/currency";
import {
  sortAccountsAlphabetically,
  sortCategoriesHierarchically,
} from "../../utils/sortUtils";
import "./ImportTransactionsAction.css";

type ImportTransactionsActionProps = {
  compact?: boolean;
};

const REQUIRED_COLUMNS = [
  "Data Ocorrência",
  "Descrição",
  "Valor",
  "Categoria",
  "Conta",
] as const;

const EXCEL_ACCEPT = ".xlsx,.xls,.xlsm,.xlsb";
const DOCUMENT_ACCEPT = ".pdf,.csv,.ods";
const IMPORT_ACCEPT = `${EXCEL_ACCEPT},${DOCUMENT_ACCEPT}`;

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];
type ExcelRow = Record<string, unknown>;
type TransactionKind = "income" | "expense" | "transfer";
type ImportRowBase = {
  id: string;
  selected: boolean;
  description: string;
  date: string;
  amountInput: string;
  notes: string[];
  sourceLabel: string;
  serverError?: string;
};

type RegularImportRow = ImportRowBase & {
  rowType: "regular";
  categoryId: string;
  accountId: string;
  originalCategoryName: string;
  originalAccountName: string;
};

type TransferImportRow = ImportRowBase & {
  rowType: "transfer";
  fromAccountId: string;
  toAccountId: string;
  originalFromAccountName: string;
  originalToAccountName: string;
};

type ImportRow = RegularImportRow | TransferImportRow;

type ParsedExcelRow = {
  sourceLine: number;
  date: string;
  description: string;
  value: number;
  categoryName: string;
  accountName: string;
  isTransfer: boolean;
};

type ParsedDocumentRow = {
  sourceLine: number;
  date: string;
  description: string;
  value: number;
};

type ImportRowIssueLevel = 0 | 1 | 2;

function normalizeLookupValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isExcelFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return [".xlsx", ".xls", ".xlsm", ".xlsb"].some((extension) =>
    fileName.endsWith(extension)
  );
}

function isInvoiceDocumentFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return [".pdf", ".csv", ".ods"].some((extension) => fileName.endsWith(extension));
}

function getStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  return "";
}

function parseLocalizedNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const raw = getStringValue(value).trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (parsedDate) {
      const year = String(parsedDate.y).padStart(4, "0");
      const month = String(parsedDate.m).padStart(2, "0");
      const day = String(parsedDate.d).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  const raw = getStringValue(value).trim();
  if (!raw) return "";

  const isoWithTimeMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (isoWithTimeMatch) {
    return `${isoWithTimeMatch[1]}-${isoWithTimeMatch[2]}-${isoWithTimeMatch[3]}`;
  }

  const spacedIsoMatch = /(\d{4})\s+(\d{2})\s+(\d{2})/.exec(raw);
  if (spacedIsoMatch) {
    return `${spacedIsoMatch[1]}-${spacedIsoMatch[2]}-${spacedIsoMatch[3]}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function resolveHeaders(sample: ExcelRow): Record<RequiredColumn, string> {
  const headers = Object.keys(sample);
  const lookup = new Map(headers.map((header) => [normalizeLookupValue(header), header]));

  const resolved = {} as Record<RequiredColumn, string>;
  for (const column of REQUIRED_COLUMNS) {
    const found = lookup.get(normalizeLookupValue(column));
    if (!found) {
      throw new Error(`A coluna obrigatória "${column}" não foi encontrada no arquivo.`);
    }
    resolved[column] = found;
  }

  return resolved;
}

function createRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function findMatchingAccountId(name: string, accounts: Account[]): string {
  const normalizedName = normalizeLookupValue(name);
  if (!normalizedName) return "";

  return accounts.find((account) => normalizeLookupValue(account.name) === normalizedName)?.id ?? "";
}

function findMatchingCategoryId(name: string, categories: Category[]): string {
  const normalizedName = normalizeLookupValue(name);
  if (!normalizedName) return "";

  return categories.find((category) => normalizeLookupValue(category.name) === normalizedName)?.id ?? "";
}

function getRegularKind(amountInput: string): Exclude<TransactionKind, "transfer"> {
  return parseLocalizedNumber(amountInput) < 0 ? "expense" : "income";
}

function getBlockingErrors(row: ImportRow): string[] {
  const errors: string[] = [];
  const amount = parseLocalizedNumber(row.amountInput);

  if (!row.date) errors.push("Informe uma data válida.");
  if (!row.description.trim()) errors.push("Descrição é obrigatória.");

  if (row.rowType === "transfer") {
    if (Math.abs(amount) <= 0) errors.push("Valor da transferência deve ser maior que zero.");
    if (!row.fromAccountId) errors.push("Selecione a conta de origem.");
    if (!row.toAccountId) errors.push("Selecione a conta de destino.");
    if (row.fromAccountId && row.toAccountId && row.fromAccountId === row.toAccountId) {
      errors.push("Origem e destino devem ser contas diferentes.");
    }
    return errors;
  }

  if (amount === 0) errors.push("Valor não pode ser zero.");
  if (!row.categoryId) errors.push("Selecione a categoria equivalente.");
  if (!row.accountId) errors.push("Selecione a conta equivalente.");

  return errors;
}

function buildPayload(row: ImportRow): CreateTransactionPayload {
  if (row.rowType === "transfer") {
    return {
      type: "transfer",
      description: row.description.trim(),
      value: Math.abs(parseLocalizedNumber(row.amountInput)),
      fromAccountId: row.fromAccountId,
      toAccountId: row.toAccountId,
      startDate: row.date,
      occurrenceType: "single",
    };
  }

  const amount = parseLocalizedNumber(row.amountInput);
  const type = getRegularKind(row.amountInput);

  return {
    type,
    description: row.description.trim(),
    value: Math.abs(amount),
    categoryId: row.categoryId,
    accountId: row.accountId,
    startDate: row.date,
    occurrenceType: "single",
  };
}

function getRowIssueLevel(row: ImportRow): ImportRowIssueLevel {
  if (row.serverError || getBlockingErrors(row).length > 0) {
    return 2;
  }

  if (row.notes.length > 0) {
    return 1;
  }

  return 0;
}

export function downloadTransactionsImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      "Data Ocorrência": "12/03/2026",
      "Descrição": "Salário",
      Valor: "3500,00",
      Categoria: "Salário",
      Conta: "Conta Corrente",
    },
    {
      "Data Ocorrência": "13/03/2026",
      "Descrição": "Supermercado",
      Valor: "-250,30",
      Categoria: "Alimentação",
      Conta: "Cartão",
    },
    {
      "Data Ocorrência": "14/03/2026",
      "Descrição": "Reserva mensal",
      Valor: "-500,00",
      Categoria: "Transferência",
      Conta: "Conta Corrente",
    },
    {
      "Data Ocorrência": "14/03/2026",
      "Descrição": "Reserva mensal",
      Valor: "500,00",
      Categoria: "Transferência",
      Conta: "Poupança",
    },
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Importacao");
  XLSX.writeFile(workbook, "modelo-importacao-lancamentos.xlsx");
}

export default function ImportTransactionsAction({
  compact = false,
}: Readonly<ImportTransactionsActionProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accounts, reloadAccounts } = useAccounts();
  const { categories, reloadCategories } = useCategories();
  const { reloadLaunches } = useLaunches();
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [creatingKeys, setCreatingKeys] = useState<string[]>([]);
  const [accountOptions, setAccountOptions] = useState<Account[] | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Category[] | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const activeAccounts = accountOptions ?? accounts;
  const activeCategories = categoryOptions ?? categories;
  const sortedAccounts = sortAccountsAlphabetically(activeAccounts);
  const sortedCategories = sortCategoriesHierarchically(activeCategories);
  const isBusy = isProcessingFile || isImporting;
  const selectedCount = rows.filter((row) => row.selected).length;
  const allSelected = rows.length > 0 && rows.every((row) => row.selected);
  const pendingCount = rows.filter((row) => getBlockingErrors(row).length > 0).length;
  const displayRows = rows
    .map((row, index) => ({
      row,
      index,
      issueLevel: getRowIssueLevel(row),
    }))
    .sort((left, right) => {
      if (right.issueLevel !== left.issueLevel) {
        return right.issueLevel - left.issueLevel;
      }

      return left.index - right.index;
    })
    .map(({ row }) => row);

  function resetState() {
    if (isBusy) return;
    setIsChooserOpen(false);
    setIsPreviewOpen(false);
    setRows([]);
    setFileName("");
    setIsProcessingFile(false);
    setProcessingMessage("");
    setAccountOptions(null);
    setCategoryOptions(null);
    setSubmitError("");
    setSubmitSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openChooser() {
    if (isBusy) return;
    setSubmitError("");
    setSubmitSuccess("");
    setIsChooserOpen(true);
  }

  function openFilePicker() {
    if (isBusy) return;
    setSubmitError("");
    setSubmitSuccess("");
    fileInputRef.current?.click();
  }

  function updateRow(id: string, updater: (row: ImportRow) => ImportRow) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...updater(row),
              serverError: undefined,
            }
          : row
      )
    );
    setSubmitError("");
    setSubmitSuccess("");
  }

  function updateRowsMatching(
    matcher: (row: ImportRow) => boolean,
    updater: (row: ImportRow) => ImportRow
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        matcher(row)
          ? {
              ...updater(row),
              serverError: undefined,
            }
          : row
      )
    );
    setSubmitError("");
    setSubmitSuccess("");
  }

  function updateRegularCategoryMapping(
    originalName: string,
    categoryId: string,
    sourceRowId?: string
  ) {
    const normalizedName = normalizeLookupValue(originalName);
    if (!normalizedName && !sourceRowId) return;

    updateRowsMatching(
      (row) =>
        row.rowType === "regular" &&
        (row.id === sourceRowId ||
          (!!normalizedName &&
            normalizeLookupValue(row.originalCategoryName) === normalizedName)),
      (row) =>
        row.rowType === "regular"
          ? {
              ...row,
              categoryId,
            }
          : row
    );
  }

  function updateRegularCategoryForRow(rowId: string, categoryId: string) {
    updateRow(rowId, (currentRow) =>
      currentRow.rowType === "regular"
        ? {
            ...currentRow,
            categoryId,
          }
        : currentRow
    );
  }

  function updateAccountMapping(
    originalName: string,
    accountId: string
  ) {
    const normalizedName = normalizeLookupValue(originalName);
    if (!normalizedName) return;

    updateRowsMatching(
      (row) =>
        (row.rowType === "regular" &&
          normalizeLookupValue(row.originalAccountName) === normalizedName) ||
        (row.rowType === "transfer" &&
          (normalizeLookupValue(row.originalFromAccountName) === normalizedName ||
            normalizeLookupValue(row.originalToAccountName) === normalizedName)),
      (row) => {
        if (row.rowType === "regular") {
          return {
              ...row,
              accountId,
            };
        }

        const shouldUpdateFrom = normalizeLookupValue(row.originalFromAccountName) === normalizedName;
        const shouldUpdateTo = normalizeLookupValue(row.originalToAccountName) === normalizedName;

        return {
          ...row,
          fromAccountId: shouldUpdateFrom ? accountId : row.fromAccountId,
          toAccountId: shouldUpdateTo ? accountId : row.toAccountId,
        };
      }
    );
  }

  function updateAccountForRow(
    rowId: string,
    accountId: string,
    target: "regular" | "from" | "to"
  ) {
    updateRow(rowId, (currentRow) => {
      if (currentRow.rowType === "regular") {
        return target === "regular"
          ? {
              ...currentRow,
              accountId,
            }
          : currentRow;
      }

      if (target === "from") {
        return {
          ...currentRow,
          fromAccountId: accountId,
        };
      }

      if (target === "to") {
        return {
          ...currentRow,
          toAccountId: accountId,
        };
      }

      return currentRow;
    });
  }

  function withCreatingKey<T>(key: string, action: () => Promise<T>) {
    setCreatingKeys((currentKeys) => [...currentKeys, key]);
    return action().finally(() => {
      setCreatingKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key));
    });
  }

  function isCreating(key: string) {
    return creatingKeys.includes(key);
  }

  async function handleCreateCategoryForName(originalName: string, sourceRowId: string) {
    const trimmedName = originalName.trim();
    if (!trimmedName) return;

    const createKey = `category:${normalizeLookupValue(trimmedName)}`;
    if (isCreating(createKey)) return;

    try {
      await withCreatingKey(createKey, () => createCategory({ name: trimmedName }));
      const freshCategories = await getCategories();
      setCategoryOptions(freshCategories);
      void reloadCategories();

      const resolvedCategoryId = findMatchingCategoryId(trimmedName, freshCategories);
      if (!resolvedCategoryId) {
        throw new Error("A categoria foi criada, mas não foi possível localizá-la para seleção automática.");
      }

      updateRegularCategoryMapping(trimmedName, resolvedCategoryId, sourceRowId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a categoria.";
      setSubmitError(message);
      setSubmitSuccess("");
    }
  }

  async function handleCreateAccountForName(
    originalName: string
  ) {
    const trimmedName = originalName.trim();
    if (!trimmedName) return;

    const createKey = `account:${normalizeLookupValue(trimmedName)}`;
    if (isCreating(createKey)) return;

    try {
      await withCreatingKey(createKey, () =>
        createAccount({ name: trimmedName, initialBalance: 0 })
      );
      const freshAccounts = await getAccounts();
      setAccountOptions(freshAccounts);
      void reloadAccounts();

      const resolvedAccountId = findMatchingAccountId(trimmedName, freshAccounts);
      if (!resolvedAccountId) {
        throw new Error("A conta foi criada, mas não foi possível localizá-la para seleção automática.");
      }

      updateAccountMapping(trimmedName, resolvedAccountId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a conta.";
      setSubmitError(message);
      setSubmitSuccess("");
    }
  }

  function openPreviewWithRows(importedRows: ImportRow[], selectedFileName: string) {
    if (importedRows.length === 0) {
      throw new Error("Nenhum lançamento válido foi encontrado no arquivo.");
    }

    setRows(importedRows);
    setFileName(selectedFileName);
    setIsProcessingFile(false);
    setProcessingMessage("");
    setSubmitError("");
    setSubmitSuccess("");
    setIsChooserOpen(false);
    setIsPreviewOpen(true);
  }

  function mapExcelRowsToImportRows(parsedRows: ParsedExcelRow[]): ImportRow[] {
    const importedRows: ImportRow[] = [];

    for (let index = 0; index < parsedRows.length; index += 1) {
      const currentRow = parsedRows[index];
      if (currentRow.isTransfer) {
        const nextRow = parsedRows[index + 1];
        const notes: string[] = [];
        let shouldConsumeNextRow = false;

        if (!nextRow?.isTransfer) {
          notes.push("Transferência deve possuir a linha seguinte para destino.");
        } else {
          shouldConsumeNextRow = true;
          if (currentRow.date && nextRow.date && currentRow.date !== nextRow.date) {
            notes.push("As duas linhas da transferência vieram com datas diferentes. Ajuste antes de importar.");
          }
          if (
            currentRow.value !== 0 &&
            nextRow.value !== 0 &&
            Math.abs(currentRow.value) !== Math.abs(nextRow.value)
          ) {
            notes.push("Os valores de origem e destino da transferência estão diferentes.");
          }
        }

        importedRows.push({
          id: createRowId(),
          rowType: "transfer",
          selected: true,
          description: currentRow.description || nextRow?.description || "Transferência",
          date: currentRow.date || nextRow?.date || "",
          amountInput: formatBRLInput(Math.abs(currentRow.value || nextRow?.value || 0)),
          fromAccountId: findMatchingAccountId(currentRow.accountName, sortedAccounts),
          toAccountId: findMatchingAccountId(nextRow?.accountName ?? "", sortedAccounts),
          originalFromAccountName: currentRow.accountName,
          originalToAccountName: nextRow?.accountName ?? "",
          notes,
          sourceLabel: shouldConsumeNextRow
            ? `Linhas ${currentRow.sourceLine} e ${nextRow.sourceLine}`
            : `Linha ${currentRow.sourceLine}`,
        });

        if (shouldConsumeNextRow) {
          index += 1;
        }

        continue;
      }

      importedRows.push({
        id: createRowId(),
        rowType: "regular",
        selected: true,
        description: currentRow.description,
        date: currentRow.date,
        amountInput: formatBRLInputSigned(currentRow.value),
        categoryId: findMatchingCategoryId(currentRow.categoryName, sortedCategories),
        accountId: findMatchingAccountId(currentRow.accountName, sortedAccounts),
        originalCategoryName: currentRow.categoryName,
        originalAccountName: currentRow.accountName,
        notes: [],
        sourceLabel: `Linha ${currentRow.sourceLine}`,
      });
    }

    return importedRows;
  }

  function mapDocumentRowsToImportRows(parsedRows: ParsedDocumentRow[]): ImportRow[] {
    return parsedRows.map((row) => ({
      id: createRowId(),
      rowType: "regular",
      selected: true,
      description: row.description,
      date: row.date,
      amountInput: formatBRLInputSigned(-Math.abs(row.value)),
      categoryId: "",
      accountId: "",
      originalCategoryName: "",
      originalAccountName: "",
      notes: [],
      sourceLabel: `Item ${row.sourceLine}`,
    }));
  }

  async function parseExcelFile(file: File) {
    setProcessingMessage("Lendo arquivo Excel e preparando a pré-visualização...");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("O arquivo não possui planilhas para importar.");
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      defval: "",
      raw: true,
    });

    if (jsonRows.length === 0) {
      throw new Error("O arquivo Excel está vazio.");
    }

    const headers = resolveHeaders(jsonRows[0]);
    const parsedRows: ParsedExcelRow[] = jsonRows.map((jsonRow, index) => {
      const categoryName = getStringValue(jsonRow[headers["Categoria"]]).trim();
      return {
        sourceLine: index + 2,
        date: normalizeDate(jsonRow[headers["Data Ocorrência"]]),
        description: getStringValue(jsonRow[headers["Descrição"]]).trim(),
        value: parseLocalizedNumber(jsonRow[headers["Valor"]]),
        categoryName,
        accountName: getStringValue(jsonRow[headers["Conta"]]).trim(),
        isTransfer: normalizeLookupValue(categoryName) === "transferencia",
      };
    });

    openPreviewWithRows(mapExcelRowsToImportRows(parsedRows), file.name);
  }

  async function parseInvoiceDocumentFile(file: File) {
    setProcessingMessage("Enviando arquivo para processamento e aguardando retorno...");
    const importedItems = await importInvoiceDocument(file);
    const parsedRows: ParsedDocumentRow[] = importedItems.map((item: ImportedInvoiceItem, index) => ({
      sourceLine: index + 1,
      date: normalizeDate(item.date),
      description: getStringValue(item.description).trim(),
      value: Math.abs(parseLocalizedNumber(item.amount)),
    }));

    const validRows = parsedRows.filter((row) => row.description || row.date || row.value > 0);
    openPreviewWithRows(mapDocumentRowsToImportRows(validRows), file.name);
  }

  async function parseFile(file: File) {
    if (isExcelFile(file)) {
      await parseExcelFile(file);
      return;
    }

    if (isInvoiceDocumentFile(file)) {
      await parseInvoiceDocumentFile(file);
      return;
    }

    throw new Error("Selecione um arquivo válido (.xlsx, .xls, .xlsm, .xlsb, .pdf, .csv ou .ods).");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setProcessingMessage("Preparando importação...");

    try {
      await parseFile(file);
    } catch (error) {
      setIsProcessingFile(false);
      setProcessingMessage("");
      const message = error instanceof Error ? error.message : "Não foi possível ler o arquivo selecionado.";
      globalThis.alert(message);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleImportSelected() {
    const selectedRowsToImport = rows.filter((row) => row.selected);
    if (selectedRowsToImport.length === 0) {
      setSubmitError("Selecione ao menos um registro para importar.");
      setSubmitSuccess("");
      return;
    }

    const invalidRows = selectedRowsToImport.filter((row) => getBlockingErrors(row).length > 0);
    if (invalidRows.length > 0) {
      setSubmitError(
        `${invalidRows.length} registro(s) selecionado(s) ainda possuem pendências. Ajuste os campos destacados antes de importar.`
      );
      setSubmitSuccess("");
      return;
    }

    setIsImporting(true);
    setSubmitError("");
    setSubmitSuccess("");

    let failedById = new Map<string, string>();
    let successIds = new Set<string>();

    try {
      const result = await importTransactionsBatch(
        selectedRowsToImport.map((row) => ({
          clientId: row.id,
          payload: buildPayload(row),
        }))
      );

      failedById = result.failedByClientId;
      successIds = new Set(result.successClientIds);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar o lote para o servidor.";

      setIsImporting(false);
      setSubmitError(message);
      setSubmitSuccess("");
      return;
    }

    try {
      if (successIds.size > 0) {
        await reloadLaunches();
        await reloadAccounts();
      }
    } finally {
      setIsImporting(false);
    }

    if (failedById.size === 0) {
      resetState();
      return;
    }

    setRows((currentRows) =>
      currentRows
        .filter((row) => !successIds.has(row.id))
        .map((row) => ({
          ...row,
          serverError: failedById.get(row.id),
        }))
    );

    if (successIds.size > 0) {
      setSubmitSuccess(`${successIds.size} registro(s) importado(s) com sucesso.`);
    }

    setSubmitError(
      `${failedById.size} registro(s) falharam e permaneceram na grade para correção e nova tentativa.`
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button
        type="button"
        className={`import-transactions-trigger ${compact ? "compact" : ""}`}
        onClick={openChooser}
        disabled={isBusy}
      >
        <span className="import-transactions-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L17.5 7H14z" fill="currentColor" opacity="0.18" />
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L17.5 7H14zM7 4h6v4h4v12H7z" fill="currentColor" />
            <path d="M9.2 16.8 10.9 14l-1.6-2.8h1.6l.9 1.7.9-1.7h1.6L12.7 14l1.7 2.8h-1.6l-1-1.8-1 1.8z" fill="#ffffff" />
          </svg>
        </span>
        <span>Importar</span>
      </button>

      <Modal
        isOpen={isChooserOpen}
        title="Importar lançamentos"
        onClose={resetState}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={resetState} disabled={isBusy}>
              Cancelar
            </Button>
            <Button onClick={openFilePicker} disabled={isBusy}>
              {isProcessingFile ? "Processando..." : "Buscar arquivo"}
            </Button>
          </>
        }
      >
        <div className="import-transactions-intro">
          <p>
            Selecione um arquivo Excel com as colunas <strong>Data Ocorrência</strong>, <strong>Descrição</strong>, <strong>Valor</strong>, <strong>Categoria</strong> e <strong>Conta</strong>.
          </p>
          <p>
            Também é possível enviar arquivos <strong>PDF</strong>, <strong>CSV</strong> e <strong>ODS</strong> de banco para extração automática dos lançamentos antes da revisão.
          </p>
          <p>
            Depois da leitura, o sistema abrirá uma pré-visualização para revisar, mapear contas e categorias e escolher quais registros serão importados.
          </p>
          <button
            type="button"
            className="import-transactions-template-link"
            onClick={downloadTransactionsImportTemplate}
          >
            Baixar modelo
          </button>

          {isProcessingFile && (
            <div className="import-transactions-loading" role="status" aria-live="polite">
              <span className="import-transactions-loading-spinner" aria-hidden="true" />
              <div className="import-transactions-loading-text">
                <strong>Processando arquivo</strong>
                <span>{processingMessage || "Aguarde enquanto os lançamentos são preparados."}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isPreviewOpen}
        title={fileName ? `Importar lançamentos: ${fileName}` : "Importar lançamentos"}
        onClose={resetState}
        size="fullscreen"
        className="import-transactions-preview-modal"
        footer={
          <>
            <Button variant="secondary" onClick={resetState} disabled={isBusy}>
              Cancelar
            </Button>
            <Button onClick={handleImportSelected} disabled={isBusy || rows.length === 0}>
              {isImporting ? "Importando..." : `Importar selecionados (${selectedCount})`}
            </Button>
          </>
        }
      >
        <div className="import-transactions-summary">
          <p>
            <strong>{rows.length}</strong> registro(s) lido(s) do arquivo. Marque o que deseja importar, ajuste os campos quando necessário e confirme.
            <br />
            Transferências são agrupadas em pares consecutivos quando a categoria vier como <strong>Transferência</strong>.
          </p>
          <button
            type="button"
            className="import-transactions-template-link"
            onClick={downloadTransactionsImportTemplate}
          >
            Baixar modelo
          </button>
        </div>

        {submitError && <div className="import-transactions-message error">{submitError}</div>}
        {submitSuccess && <div className="import-transactions-message success">{submitSuccess}</div>}

        {rows.length === 0 ? (
          <div className="import-transactions-empty-state">
            Nenhum registro disponível para importação.
          </div>
        ) : (
          <div className="import-transactions-grid-wrapper">
            <div className="import-transactions-grid">
              <div className="import-transactions-grid-row header">
                <div className="import-transactions-grid-cell import-transactions-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) =>
                        setRows((currentRows) =>
                          currentRows.map((row) => ({ ...row, selected: event.target.checked }))
                        )
                      }
                    />
                    Todos
                  </label>
                </div>
                <div className="import-transactions-grid-cell">Tipo</div>
                <div className="import-transactions-grid-cell">Data</div>
                <div className="import-transactions-grid-cell">Descrição</div>
                <div className="import-transactions-grid-cell">Valor</div>
                <div className="import-transactions-grid-cell">Categoria</div>
                <div className="import-transactions-grid-cell">Conta / Origem</div>
                <div className="import-transactions-grid-cell">Conta destino</div>
                <div className="import-transactions-grid-cell">Observações</div>
              </div>

              {displayRows.map((row) => {
                const rowErrors = getBlockingErrors(row);
                const rowKind: TransactionKind =
                  row.rowType === "transfer" ? "transfer" : getRegularKind(row.amountInput);

                return (
                  <div
                    key={row.id}
                    className={[
                      "import-transactions-grid-row",
                      "data",
                      rowErrors.length > 0 ? "has-errors" : "",
                      row.serverError ? "has-server-error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="import-transactions-grid-cell import-transactions-checkbox">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(event) =>
                          updateRow(row.id, (currentRow) => ({
                            ...currentRow,
                            selected: event.target.checked,
                          }))
                        }
                      />
                    </div>

                    <div className="import-transactions-grid-cell">
                      <span className={`import-transactions-type ${rowKind}`}>
                        {rowKind === "income" && "Receita"}
                        {rowKind === "expense" && "Despesa"}
                        {rowKind === "transfer" && "Transferência"}
                      </span>
                    </div>

                    <div className="import-transactions-grid-cell">
                      <input
                        className="import-transactions-input"
                        type="date"
                        value={row.date}
                        onChange={(event) =>
                          updateRow(row.id, (currentRow) => ({
                            ...currentRow,
                            date: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="import-transactions-grid-cell">
                      <input
                        className="import-transactions-input"
                        type="text"
                        value={row.description}
                        onChange={(event) =>
                          updateRow(row.id, (currentRow) => ({
                            ...currentRow,
                            description: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="import-transactions-grid-cell">
                      <input
                        className="import-transactions-input"
                        type="text"
                        value={row.amountInput}
                        onChange={(event) =>
                          updateRow(row.id, (currentRow) => ({
                            ...currentRow,
                            amountInput: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="import-transactions-grid-cell">
                      {row.rowType === "transfer" ? (
                        <div className="import-transactions-readonly">Transferência</div>
                      ) : (
                        <div className="import-transactions-select-row">
                          <SearchableSelect
                            label={undefined}
                            items={sortedCategories}
                            selectedValue={row.categoryId}
                            onSelect={(value) => {
                              if (row.categoryId || !row.originalCategoryName.trim()) {
                                updateRegularCategoryForRow(row.id, value);
                                return;
                              }

                              updateRegularCategoryMapping(row.originalCategoryName, value, row.id);
                            }}
                            getLabel={(category) => category.name}
                            getId={(category) => category.id}
                            placeholder={
                              row.originalCategoryName
                                ? `Mapear: ${row.originalCategoryName}`
                                : "Buscar categoria..."
                            }
                          />
                          {!row.categoryId && row.originalCategoryName.trim() && (
                            <button
                              type="button"
                              className="btn-small import-transactions-create-btn"
                              onClick={() => void handleCreateCategoryForName(row.originalCategoryName, row.id)}
                              disabled={isCreating(`category:${normalizeLookupValue(row.originalCategoryName)}`)}
                              title={`Criar categoria ${row.originalCategoryName}`}
                            >
                              +
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="import-transactions-grid-cell">
                      <div className="import-transactions-select-row">
                        <SearchableSelect
                          label={undefined}
                          items={sortedAccounts}
                          selectedValue={row.rowType === "transfer" ? row.fromAccountId : row.accountId}
                          onSelect={(value) => {
                            if (row.rowType === "transfer") {
                              if (row.fromAccountId) {
                                updateAccountForRow(row.id, value, "from");
                                return;
                              }

                              if (!row.originalFromAccountName.trim()) {
                                updateAccountForRow(row.id, value, "from");
                                return;
                              }

                              updateAccountMapping(row.originalFromAccountName, value);
                              return;
                            }

                            if (row.accountId || !row.originalAccountName.trim()) {
                              updateAccountForRow(row.id, value, "regular");
                              return;
                            }

                            updateAccountMapping(row.originalAccountName, value);
                          }}
                          getLabel={(account) => account.name}
                          getId={(account) => account.id}
                          placeholder={
                            row.rowType === "transfer"
                              ? row.originalFromAccountName
                                ? `Origem: ${row.originalFromAccountName}`
                                : "Buscar conta origem..."
                              : row.originalAccountName
                                ? `Mapear: ${row.originalAccountName}`
                                : "Buscar conta..."
                          }
                        />
                        {row.rowType === "transfer" && !row.fromAccountId && row.originalFromAccountName.trim() && (
                          <button
                            type="button"
                            className="btn-small import-transactions-create-btn"
                            onClick={() => void handleCreateAccountForName(row.originalFromAccountName)}
                            disabled={isCreating(`account:${normalizeLookupValue(row.originalFromAccountName)}`)}
                            title={`Criar conta ${row.originalFromAccountName}`}
                          >
                            +
                          </button>
                        )}
                        {row.rowType === "regular" && !row.accountId && row.originalAccountName.trim() && (
                          <button
                            type="button"
                            className="btn-small import-transactions-create-btn"
                            onClick={() => void handleCreateAccountForName(row.originalAccountName)}
                            disabled={isCreating(`account:${normalizeLookupValue(row.originalAccountName)}`)}
                            title={`Criar conta ${row.originalAccountName}`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="import-transactions-grid-cell">
                      {row.rowType === "transfer" ? (
                        <div className="import-transactions-select-row">
                          <SearchableSelect
                            label={undefined}
                            items={sortedAccounts}
                            selectedValue={row.toAccountId}
                            onSelect={(value) => {
                              if (row.toAccountId || !row.originalToAccountName.trim()) {
                                updateAccountForRow(row.id, value, "to");
                                return;
                              }

                              updateAccountMapping(row.originalToAccountName, value);
                            }}
                            getLabel={(account) => account.name}
                            getId={(account) => account.id}
                            placeholder={
                              row.originalToAccountName
                                ? `Destino: ${row.originalToAccountName}`
                                : "Buscar conta destino..."
                            }
                          />
                          {!row.toAccountId && row.originalToAccountName.trim() && (
                            <button
                              type="button"
                              className="btn-small import-transactions-create-btn"
                              onClick={() => void handleCreateAccountForName(row.originalToAccountName)}
                              disabled={isCreating(`account:${normalizeLookupValue(row.originalToAccountName)}`)}
                              title={`Criar conta ${row.originalToAccountName}`}
                            >
                              +
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="import-transactions-readonly">Não se aplica</div>
                      )}
                    </div>

                    <div className="import-transactions-grid-cell">
                      <div className="import-transactions-notes">
                        <span className="import-transactions-note">{row.sourceLabel}</span>
                        {row.notes.map((note) => (
                          <span key={note} className="import-transactions-note">
                            {note}
                          </span>
                        ))}
                        {rowErrors.map((error) => (
                          <span key={error} className="import-transactions-note">
                            {error}
                          </span>
                        ))}
                        {row.serverError && (
                          <span className="import-transactions-note server-error">
                            {row.serverError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, color: "var(--gray-600)" }}>
          {selectedCount} registro(s) selecionado(s) para importação.
          {pendingCount > 0 ? ` ${pendingCount} registro(s) ainda possuem pendências.` : ""}
        </div>
      </Modal>
    </>
  );
}