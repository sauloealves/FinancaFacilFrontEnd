import { useEffect, useMemo, useRef, useState } from "react";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { useCategories } from "../contexts/categories/useCategories";
import { useTags } from "../contexts/tags/useTags";
import { getLaunches } from "../services/launchService";
import { normalizeDateFromBackend } from "../utils/date";
import { isTransactionType } from "../utils/sortUtils";
import type { LaunchRow } from "../features/launches/types";
import {
  buildExplicitTagIdsByCategory,
  buildParentByCategoryId,
} from "../features/tags/tagInheritance";
import "./ReportByTagPage.css";

type TagReportCard = {
  key: string;
  label: string;
  color: string;
  byMonth: Record<string, number>;
  total: number;
  launchCount: number;
  categoryCount: number;
  isUntagged: boolean;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createDefaultReportDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startMonthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  return {
    startDate: formatDateInputValue(startMonthStart),
    endDate: formatDateInputValue(currentMonthEnd),
  };
}

function normalizeStartDate(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function normalizeEndDate(date: string): string {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${date.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function parseYearMonth(date: string): { year: number; month: number } {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  return { year, month };
}

function getMonthRange(startDate: string, endDate: string): string[] {
  const start = parseYearMonth(startDate);
  const end = parseYearMonth(endDate);
  const months: string[] = [];

  const cursor = new Date(start.year, start.month - 1, 1);
  const limit = new Date(end.year, end.month - 1, 1);

  while (cursor <= limit) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function formatMonthYearLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthLabel = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toLowerCase();

  return `${monthLabel}/${year}`;
}

function createZeroMonthMap(monthKeys: string[]): Record<string, number> {
  return monthKeys.reduce<Record<string, number>>((acc, monthKey) => {
    acc[monthKey] = 0;
    return acc;
  }, {});
}

function enrichLaunch(launch: LaunchRow): LaunchRow {
  return {
    ...launch,
    date: normalizeDateFromBackend(launch.date),
  };
}

function getInheritedTagIds(
  categoryId: string | undefined,
  parentByCategoryId: Record<string, string | undefined>,
  explicitTagIdsByCategory: Record<string, Set<string>>,
): Set<string> {
  if (!categoryId) {
    return new Set<string>();
  }

  const inheritedTagIds = new Set<string>();
  const visited = new Set<string>();
  let currentCategoryId: string | undefined = categoryId;

  while (currentCategoryId && !visited.has(currentCategoryId)) {
    visited.add(currentCategoryId);

    const explicitTagIds = explicitTagIdsByCategory[currentCategoryId];
    if (explicitTagIds) {
      for (const tagId of explicitTagIds) {
        inheritedTagIds.add(tagId);
      }
    }

    currentCategoryId = parentByCategoryId[currentCategoryId];
  }

  return inheritedTagIds;
}

function getTagDisplayColor(color: string | undefined): string {
  return color && color.trim() ? color : "#64748b";
}

export default function ReportByTagPage() {
  const { selectedAccounts } = useAccountFilter();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { tags, tagsByCategory } = useTags();

  const defaultDateRange = useMemo(() => createDefaultReportDateRange(), []);
  const [draftStartDate, setDraftStartDate] = useState(defaultDateRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultDateRange.endDate);
  const [draftSelectedTagIds, setDraftSelectedTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaultDateRange.startDate);
  const [endDate, setEndDate] = useState(defaultDateRange.endDate);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [cards, setCards] = useState<TagReportCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const tagFilterRef = useRef<HTMLDetailsElement | null>(null);
  const monthKeys = useMemo(() => {
    const normalizedStart = normalizeStartDate(startDate);
    const normalizedEnd = normalizeEndDate(endDate);
    return getMonthRange(normalizedStart, normalizedEnd);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isTagFilterOpen || !tagFilterRef.current) {
        return;
      }

      if (event.target instanceof Node && !tagFilterRef.current.contains(event.target)) {
        setIsTagFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTagFilterOpen]);

  useEffect(() => {
    let mounted = true;

    async function loadReportCards() {
      setLoading(true);
      setLoadError("");

      try {
        const normalizedStart = normalizeStartDate(startDate);
        const normalizedEnd = normalizeEndDate(endDate);
        const launches = await getLaunches({ startDate: normalizedStart, endDate: normalizedEnd });

        const normalizedLaunches = launches.map(enrichLaunch);

        const accountFilteredLaunches =
          selectedAccounts.length === 0
            ? normalizedLaunches
            : normalizedLaunches.filter((launch) => {
                if (isTransactionType(launch.type, "transfer")) {
                  return (
                    selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
                    selectedAccounts.includes(launch.toAccount?.id ?? "")
                  );
                }

                return selectedAccounts.includes(launch.account?.id ?? "");
              });

        const expenseLaunches = accountFilteredLaunches.filter(
          (launch) => isTransactionType(launch.type, "expense") && !isTransactionType(launch.type, "transfer"),
        );

        const parentByCategoryId = buildParentByCategoryId(categories);
        const explicitTagIdsByCategory = buildExplicitTagIdsByCategory(tagsByCategory);
        const tagById = new Map(tags.map((tag) => [tag.id, tag]));
        const selectedTagIdSet = new Set(selectedTagIds);
        const includeAllTags = selectedTagIdSet.size === 0;

        const bucketByTag = new Map<
          string,
          {
            byMonth: Record<string, number>;
            total: number;
            launches: Set<string>;
            categories: Set<string>;
          }
        >();

        for (const launch of expenseLaunches) {
          const launchCategoryId = launch.category?.id;
          const inheritedTagIds = getInheritedTagIds(
            launchCategoryId,
            parentByCategoryId,
            explicitTagIdsByCategory,
          );

          const launchValue = Math.abs(launch.value);
          const addToBucket = (bucketKey: string) => {
            const currentBucket = bucketByTag.get(bucketKey) ?? {
              byMonth: createZeroMonthMap(monthKeys),
              total: 0,
              launches: new Set<string>(),
              categories: new Set<string>(),
            };

            const currentMonthKey = monthKeyFromDate(launch.date);
            if (currentBucket.byMonth[currentMonthKey] === undefined) {
              currentBucket.byMonth[currentMonthKey] = 0;
            }

            currentBucket.byMonth[currentMonthKey] += launchValue;
            currentBucket.total += launchValue;
            currentBucket.launches.add(launch.id);

            if (launchCategoryId) {
              currentBucket.categories.add(launchCategoryId);
            }

            bucketByTag.set(bucketKey, currentBucket);
          };

          if (inheritedTagIds.size === 0) {
            if (includeAllTags) {
              addToBucket("untagged");
            }

            continue;
          }

          for (const tagId of inheritedTagIds) {
            if (!includeAllTags && !selectedTagIdSet.has(tagId)) {
              continue;
            }

            addToBucket(tagId);
          }
        }

        const nextCards = Array.from(bucketByTag.entries())
          .map(([bucketKey, bucketValue]) => {
            if (bucketKey === "untagged") {
              return {
                key: "untagged",
                label: "Sem Tag",
                color: "#6b7280",
                byMonth: bucketValue.byMonth,
                total: bucketValue.total,
                launchCount: bucketValue.launches.size,
                categoryCount: bucketValue.categories.size,
                isUntagged: true,
              } satisfies TagReportCard;
            }

            const tag = tagById.get(bucketKey);

            return {
              key: bucketKey,
              label: tag?.name ?? "Tag removida",
              color: getTagDisplayColor(tag?.color),
              byMonth: bucketValue.byMonth,
              total: bucketValue.total,
              launchCount: bucketValue.launches.size,
              categoryCount: bucketValue.categories.size,
              isUntagged: false,
            } satisfies TagReportCard;
          })
          .filter((card) => card.total > 0)
          .sort((left, right) => {
            if (left.isUntagged && !right.isUntagged) {
              return 1;
            }

            if (!left.isUntagged && right.isUntagged) {
              return -1;
            }

            return right.total - left.total;
          });

        if (mounted) {
          setCards(nextCards);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setCards([]);
          setLoadError("Não foi possível carregar o relatório por tag.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadReportCards();

    return () => {
      mounted = false;
    };
  }, [
    startDate,
    endDate,
    selectedTagIds,
    selectedAccounts,
    accounts,
    categories,
    tags,
    tagsByCategory,
    monthKeys,
  ]);

  const totalValue = useMemo(
    () => cards.reduce((sum, card) => sum + card.total, 0),
    [cards],
  );

  function handleApplyFilters() {
    if (draftStartDate > draftEndDate) {
      alert("Data inicial nao pode ser maior que data final.");
      return;
    }

    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSelectedTagIds(draftSelectedTagIds);
  }

  function handleToggleDraftTag(tagId: string) {
    setDraftSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  return (
    <div className="report-by-tag-page">
      <div className="report-by-tag-toolbar">
        <div className="report-type">Relatório por tag</div>

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
            <span>Até</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(event) => setDraftEndDate(event.target.value)}
            />
          </label>
        </div>

        <details
          ref={tagFilterRef}
          className="report-tags-filter"
          open={isTagFilterOpen}
          onToggle={(event) => setIsTagFilterOpen(event.currentTarget.open)}
        >
          <summary>
            Tags: {draftSelectedTagIds.length === 0 ? "todas" : `${draftSelectedTagIds.length} selecionada(s)`}
          </summary>
          <div className="report-tags-filter-menu">
            <button
              type="button"
              className="report-tags-filter-clear"
              onClick={() => setDraftSelectedTagIds([])}
            >
              Limpar seleção
            </button>

            <div className="report-tags-filter-list">
              {tags.length === 0 && <span className="report-tags-empty">Nenhuma tag cadastrada.</span>}
              {tags.map((tag) => (
                <label key={tag.id} className="report-tags-option">
                  <input
                    type="checkbox"
                    checked={draftSelectedTagIds.includes(tag.id)}
                    onChange={() => handleToggleDraftTag(tag.id)}
                  />
                  <span className="report-tags-color" style={{ backgroundColor: tag.color }} />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
        </details>

        <button className="apply-btn" onClick={handleApplyFilters}>OK</button>
      </div>

      <div className="report-by-tag-summary">
        <span>{cards.length} card(s) no período</span>
        <strong>Total consolidado: {formatCurrency(totalValue)}</strong>
      </div>

      {loading && <div className="report-by-tag-feedback">Carregando relatório por tag...</div>}
      {!loading && loadError && <div className="report-by-tag-feedback error">{loadError}</div>}

      {!loading && !loadError && cards.length === 0 && (
        <div className="report-by-tag-feedback">Nenhum lançamento de despesa encontrado para os filtros selecionados.</div>
      )}

      {!loading && !loadError && cards.length > 0 && (
        <section className="report-by-tag-rows">
          {cards.map((card) => (
            <article key={card.key} className={`report-by-tag-card ${card.isUntagged ? "untagged" : ""}`}>
              <div className="report-by-tag-card-main">
                <header>
                  <span className="report-by-tag-card-title">
                    <span className="report-by-tag-color" style={{ backgroundColor: card.color }} />
                    {card.label}
                  </span>
                </header>

                <strong>{formatCurrency(card.total)}</strong>

                <footer>
                  <span>{card.launchCount} lançamento(s)</span>
                  <span>{card.categoryCount} categoria(s)</span>
                </footer>
              </div>

              <div className="report-by-tag-months" role="group" aria-label={`Valores por mês da tag ${card.label}`}>
                {monthKeys.map((monthKey) => (
                  <div key={`${card.key}-${monthKey}`} className="report-by-tag-month-cell">
                    <span>{formatMonthYearLabel(monthKey)}</span>
                    <strong>{formatCurrency(card.byMonth[monthKey] ?? 0)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}