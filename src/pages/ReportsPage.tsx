import { Fragment, useEffect, useMemo, useState } from "react";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { useCategories } from "../contexts/categories/useCategories";
import { getLaunches } from "../services/launchService";
import { normalizeDateFromBackend } from "../utils/date";
import { isTransactionType } from "../utils/sortUtils";
import type { LaunchRow } from "../features/launches/types";
import "./ReportsPage.css";

type ReportType = "income" | "expense";

type ReportRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  type: ReportType;
  category: string;
  subcategory: string;
  amount: number;
};

type CategorySummary = {
  category: string;
  subcategories: Array<{
    subcategory: string;
    byMonth: Record<string, number>;
    total: number;
  }>;
  byMonth: Record<string, number>;
  total: number;
};

function enrichLaunch(launch: LaunchRow, accounts: Array<{ id: string; name: string }>, categories: Array<{ id: string; name: string }>): LaunchRow {
  const findAccountName = (id?: string) => accounts.find((acc) => acc.id === id)?.name;
  const findCategoryName = (id?: string) => categories.find((cat) => cat.id === id)?.name;

  const normalizedDate = normalizeDateFromBackend(launch.date);

  return {
    ...launch,
    date: normalizedDate,
    account: launch.account?.id
      ? { id: launch.account.id, name: launch.account.name ?? findAccountName(launch.account.id) ?? "Conta" }
      : launch.account,
    fromAccount: launch.fromAccount?.id
      ? { id: launch.fromAccount.id, name: launch.fromAccount.name ?? findAccountName(launch.fromAccount.id) ?? "Conta" }
      : launch.fromAccount,
    toAccount: launch.toAccount?.id
      ? { id: launch.toAccount.id, name: launch.toAccount.name ?? findAccountName(launch.toAccount.id) ?? "Conta" }
      : launch.toAccount,
    category: launch.category?.id
      ? { id: launch.category.id, name: launch.category.name ?? findCategoryName(launch.category.id) ?? "Sem categoria" }
      : launch.category,
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function stripInstallmentSuffix(text: string): string {
  return text.replace(/\s*\(\d+\/\d+\)\s*$/u, "").trim();
}

function toDisplayCamelCase(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1))
    .join(" ");
}

function normalizeReportLabel(text: string, fallback: string): string {
  const strippedText = stripInstallmentSuffix(text);
  const normalizedText = toDisplayCamelCase(strippedText);

  return normalizedText || fallback;
}

function normalizeStartDate(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function normalizeEndDate(date: string): string {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${date.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function getMonthRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: string[] = [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= limit) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getCategoryKey(section: "income" | "expense", category: string): string {
  return `${section}:${category}`;
}

function serializeCsvCell(cell: string | number): string {
  if (typeof cell === "number") {
    // Sem aspas para o Excel interpretar como numero; decimal com virgula para locale pt-BR.
    return String(cell).replace(".", ",");
  }

  return `"${String(cell).replaceAll("\"", '""')}"`;
}

function createZeroMonthMap(monthKeys: string[]): Record<string, number> {
  return monthKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function addRecordToCategoryMap(
  categoryMap: Map<string, Map<string, Record<string, number>>>,
  record: ReportRecord
): void {
  const monthKey = monthKeyFromDate(record.date);
  const subMap = categoryMap.get(record.category) ?? new Map<string, Record<string, number>>();
  const monthBucket = subMap.get(record.subcategory) ?? {};

  monthBucket[monthKey] = (monthBucket[monthKey] || 0) + record.amount;
  subMap.set(record.subcategory, monthBucket);
  categoryMap.set(record.category, subMap);
}

function buildCategorySummary(
  categoryName: string,
  subMap: Map<string, Record<string, number>>,
  monthKeys: string[],
  sectionByMonth: Record<string, number>
): CategorySummary {
  const categoryByMonth = createZeroMonthMap(monthKeys);
  const subcategories: CategorySummary["subcategories"] = [];

  for (const [subcategoryName, byMonthRaw] of subMap.entries()) {
    const byMonth = createZeroMonthMap(monthKeys);
    let subTotal = 0;

    for (const key of monthKeys) {
      const value = byMonthRaw[key] || 0;
      byMonth[key] = value;
      subTotal += value;
      categoryByMonth[key] += value;
      sectionByMonth[key] += value;
    }

    subcategories.push({
      subcategory: subcategoryName,
      byMonth,
      total: subTotal,
    });
  }

  subcategories.sort((a, b) => a.subcategory.localeCompare(b.subcategory));

  return {
    category: categoryName,
    subcategories,
    byMonth: categoryByMonth,
    total: monthKeys.reduce((acc, key) => acc + categoryByMonth[key], 0),
  };
}

function summarizeByCategory(
  records: ReportRecord[],
  monthKeys: string[]
): { categories: CategorySummary[]; sectionByMonth: Record<string, number>; sectionTotal: number } {
  const categoryMap = new Map<string, Map<string, Record<string, number>>>();

  for (const record of records) {
    addRecordToCategoryMap(categoryMap, record);
  }

  const categories: CategorySummary[] = [];
  const sectionByMonth = createZeroMonthMap(monthKeys);

  for (const [categoryName, subMap] of categoryMap.entries()) {
    categories.push(buildCategorySummary(categoryName, subMap, monthKeys, sectionByMonth));
  }

  categories.sort((a, b) => a.category.localeCompare(b.category));
  const sectionTotal = monthKeys.reduce((acc, key) => acc + sectionByMonth[key], 0);

  return { categories, sectionByMonth, sectionTotal };
}

export default function ReportsPage() {
  const { selectedAccounts } = useAccountFilter();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [draftStartDate, setDraftStartDate] = useState("2025-11-01");
  const [draftEndDate, setDraftEndDate] = useState("2026-03-31");
  const [startDate, setStartDate] = useState("2025-11-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reportRecords, setReportRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState({
    income: true,
    expense: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    async function loadReportRecords() {
      setLoading(true);
      setLoadError("");

      try {
        const normalizedStart = normalizeStartDate(startDate);
        const normalizedEnd = normalizeEndDate(endDate);
        const launches = await getLaunches({ startDate: normalizedStart, endDate: normalizedEnd });

        const enriched = launches.map((launch) => enrichLaunch(launch, accounts, categories));

        const accountFiltered =
          selectedAccounts.length === 0
            ? enriched
            : enriched.filter((launch) => {
                if (isTransactionType(launch.type, "transfer")) {
                  return (
                    selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
                    selectedAccounts.includes(launch.toAccount?.id ?? "")
                  );
                }

                return selectedAccounts.includes(launch.account?.id ?? "");
              });

        const records = accountFiltered
          .filter(
            (launch) => isTransactionType(launch.type, "income") || isTransactionType(launch.type, "expense")
          )
          .map((launch) => ({
            id: launch.id,
            date: launch.date,
            type: launch.type as ReportType,
            category: normalizeReportLabel(launch.category?.name ?? "", "Sem Categoria"),
            subcategory: normalizeReportLabel(launch.description ?? "", "Sem Subcategoria"),
            amount: Math.abs(launch.value),
          }));

        if (mounted) {
          setReportRecords(records);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setReportRecords([]);
          setLoadError("Nao foi possivel carregar os dados do relatorio.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReportRecords();

    return () => {
      mounted = false;
    };
  }, [startDate, endDate, selectedAccounts, accounts, categories]);

  const reportData = useMemo(() => {
    const normalizedStart = normalizeStartDate(startDate);
    const normalizedEnd = normalizeEndDate(endDate);

    const monthKeys = getMonthRange(normalizedStart, normalizedEnd);
    const inRange = reportRecords.filter((record) => {
      return record.date >= normalizedStart && record.date <= normalizedEnd;
    });

    const incomes = summarizeByCategory(
      inRange.filter((record) => record.type === "income"),
      monthKeys
    );

    const expenses = summarizeByCategory(
      inRange.filter((record) => record.type === "expense"),
      monthKeys
    );

    const balanceByMonth: Record<string, number> = {};
    for (const monthKey of monthKeys) {
      balanceByMonth[monthKey] =
        (incomes.sectionByMonth[monthKey] || 0) - (expenses.sectionByMonth[monthKey] || 0);
    }

    const totalBalance = monthKeys.reduce((acc, key) => acc + (balanceByMonth[key] || 0), 0);

    return {
      monthKeys,
      incomes,
      expenses,
      balanceByMonth,
      totalBalance,
    };
  }, [startDate, endDate, reportRecords]);

  function handleApplyFilters() {
    if (draftStartDate > draftEndDate) {
      alert("Data inicial nao pode ser maior que data final.");
      return;
    }

    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
  }

  function buildExportRows(): Array<Array<string | number>> {
    const headers = ["Categoria", "Total", ...reportData.monthKeys.map(formatMonthLabel)];
    const rows: Array<Array<string | number>> = [headers];

    rows.push(["ENTRADAS", reportData.incomes.sectionTotal, ...reportData.monthKeys.map((m) => reportData.incomes.sectionByMonth[m] || 0)]);
    for (const category of reportData.incomes.categories) {
      rows.push([`  ${category.category}`, category.total, ...reportData.monthKeys.map((m) => category.byMonth[m] || 0)]);
      for (const sub of category.subcategories) {
        rows.push([`    ${sub.subcategory}`, sub.total, ...reportData.monthKeys.map((m) => sub.byMonth[m] || 0)]);
      }
    }

    rows.push(["SAIDAS", reportData.expenses.sectionTotal, ...reportData.monthKeys.map((m) => reportData.expenses.sectionByMonth[m] || 0)]);
    for (const category of reportData.expenses.categories) {
      rows.push([`  ${category.category}`, category.total, ...reportData.monthKeys.map((m) => category.byMonth[m] || 0)]);
      for (const sub of category.subcategories) {
        rows.push([`    ${sub.subcategory}`, sub.total, ...reportData.monthKeys.map((m) => sub.byMonth[m] || 0)]);
      }
    }

    rows.push(["SALDO", reportData.totalBalance, ...reportData.monthKeys.map((m) => reportData.balanceByMonth[m] || 0)]);

    return rows;
  }

  function exportExcel() {
    const rows = buildExportRows();
    const csvBody = rows
      .map((row) => row.map((cell) => serializeCsvCell(cell)).join(";"))
      .join("\r\n");

    // BOM UTF-8 evita caracteres quebrados ao abrir no Excel (acentos e R$).
    const csv = `\uFEFF${csvBody}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-receitas-despesas-${startDate}-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function exportPdf() {
    // O CSS @media print desta página esconde header/sidebar e mantém só os dados do relatório.
    globalThis.print();
    setShowExportMenu(false);
  }

  function toggleSection(section: "income" | "expense") {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function isCategoryExpanded(section: "income" | "expense", category: string): boolean {
    const key = getCategoryKey(section, category);
    return expandedCategories[key] ?? true;
  }

  function toggleCategory(section: "income" | "expense", category: string) {
    const key = getCategoryKey(section, category);
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  }

  return (
    <div className="reports-page">
      <div className="reports-toolbar">
        <div className="report-type">Receitas e despesas - mensal</div>

        <div className="date-range">
          <label>
            <span>De</span>
            <input
              type="date"
              value={draftStartDate}
              onChange={(event) => setDraftStartDate(event.target.value)}
            />
          </label>

          <label>
            <span>Ate</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(event) => setDraftEndDate(event.target.value)}
            />
          </label>

          <button className="apply-btn" onClick={handleApplyFilters}>OK</button>
        </div>

        <div className="export-menu-wrapper">
          <button className="export-btn" onClick={() => setShowExportMenu((prev) => !prev)}>
            Exportar
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <button onClick={exportExcel}>Excel (.csv)</button>
              <button onClick={exportPdf}>PDF (impressao)</button>
            </div>
          )}
        </div>
      </div>

      <div className="report-table-wrapper">
        {loading && (
          <div style={{ padding: "12px 16px", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
            Carregando dados do relatorio...
          </div>
        )}
        {loadError && (
          <div style={{ padding: "12px 16px", color: "#b91c1c", borderBottom: "1px solid #fecaca" }}>
            {loadError}
          </div>
        )}
        <table className="report-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Total</th>
              {reportData.monthKeys.map((monthKey) => (
                <th key={monthKey}>{formatMonthLabel(monthKey)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="section-row income">
              <td>
                <button
                  type="button"
                  className="section-toggle"
                  aria-expanded={expandedSections.income}
                  onClick={() => toggleSection("income")}
                >
                  <span className="section-toggle-icon">{expandedSections.income ? "-" : "+"}</span>
                  <span>Entradas</span>
                </button>
              </td>
              <td>{formatCurrency(reportData.incomes.sectionTotal)}</td>
              {reportData.monthKeys.map((monthKey) => (
                <td key={`income-${monthKey}`}>{formatCurrency(reportData.incomes.sectionByMonth[monthKey] || 0)}</td>
              ))}
            </tr>

            {expandedSections.income && reportData.incomes.categories.map((category) => (
              <Fragment key={`income-${category.category}`}>
                <tr className="category-row" key={`income-category-${category.category}`}>
                  <td>
                    <button
                      type="button"
                      className="category-toggle"
                      aria-expanded={isCategoryExpanded("income", category.category)}
                      onClick={() => toggleCategory("income", category.category)}
                    >
                      <span className="category-toggle-icon">
                        {isCategoryExpanded("income", category.category) ? "-" : "+"}
                      </span>
                      <span>{category.category}</span>
                    </button>
                  </td>
                  <td>{formatCurrency(category.total)}</td>
                  {reportData.monthKeys.map((monthKey) => (
                    <td key={`income-category-${category.category}-${monthKey}`}>
                      {formatCurrency(category.byMonth[monthKey] || 0)}
                    </td>
                  ))}
                </tr>
                {isCategoryExpanded("income", category.category) && category.subcategories.map((sub) => (
                  <tr className="subcategory-row" key={`income-sub-${category.category}-${sub.subcategory}`}>
                    <td>{sub.subcategory}</td>
                    <td>{formatCurrency(sub.total)}</td>
                    {reportData.monthKeys.map((monthKey) => (
                      <td key={`income-sub-${category.category}-${sub.subcategory}-${monthKey}`}>
                        {formatCurrency(sub.byMonth[monthKey] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}

            <tr className="section-row expense">
              <td>
                <button
                  type="button"
                  className="section-toggle"
                  aria-expanded={expandedSections.expense}
                  onClick={() => toggleSection("expense")}
                >
                  <span className="section-toggle-icon">{expandedSections.expense ? "-" : "+"}</span>
                  <span>Saidas</span>
                </button>
              </td>
              <td>{formatCurrency(reportData.expenses.sectionTotal)}</td>
              {reportData.monthKeys.map((monthKey) => (
                <td key={`expense-${monthKey}`}>{formatCurrency(reportData.expenses.sectionByMonth[monthKey] || 0)}</td>
              ))}
            </tr>

            {expandedSections.expense && reportData.expenses.categories.map((category) => (
              <Fragment key={`expense-${category.category}`}>
                <tr className="category-row" key={`expense-category-${category.category}`}>
                  <td>
                    <button
                      type="button"
                      className="category-toggle"
                      aria-expanded={isCategoryExpanded("expense", category.category)}
                      onClick={() => toggleCategory("expense", category.category)}
                    >
                      <span className="category-toggle-icon">
                        {isCategoryExpanded("expense", category.category) ? "-" : "+"}
                      </span>
                      <span>{category.category}</span>
                    </button>
                  </td>
                  <td>{formatCurrency(category.total)}</td>
                  {reportData.monthKeys.map((monthKey) => (
                    <td key={`expense-category-${category.category}-${monthKey}`}>
                      {formatCurrency(category.byMonth[monthKey] || 0)}
                    </td>
                  ))}
                </tr>
                {isCategoryExpanded("expense", category.category) && category.subcategories.map((sub) => (
                  <tr className="subcategory-row" key={`expense-sub-${category.category}-${sub.subcategory}`}>
                    <td>{sub.subcategory}</td>
                    <td>{formatCurrency(sub.total)}</td>
                    {reportData.monthKeys.map((monthKey) => (
                      <td key={`expense-sub-${category.category}-${sub.subcategory}-${monthKey}`}>
                        {formatCurrency(sub.byMonth[monthKey] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}

            <tr className="balance-row">
              <td>Saldo</td>
              <td>{formatCurrency(reportData.totalBalance)}</td>
              {reportData.monthKeys.map((monthKey) => (
                <td key={`balance-${monthKey}`}>{formatCurrency(reportData.balanceByMonth[monthKey] || 0)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
