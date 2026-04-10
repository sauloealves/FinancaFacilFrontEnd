/**
 * Datas financeiras são datas civis (YYYY-MM-DD)
 * Não devem usar Date() diretamente (timezone)
 */

export function formatDateBR(date: string): string {
  const normalizedDate = normalizeDateFromBackend(date);
  const [year, month, day] = normalizedDate.split("-");
  return `${day?.padStart(2, "0") ?? ""}/${month?.padStart(2, "0") ?? ""}/${year?.padStart(4, "0") ?? ""}`;
}

export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatMonthBR(month: string): string {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Normaliza a data que vem do backend para o formato YYYY-MM-DD
 * Processa formatos como: "01T00:00:00/01/2026" → "2026-01-01"
 */
export function normalizeDateFromBackend(dateStr: string): string {
  if (!dateStr) return "";
  
  // Se já está no formato correto YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split("T")[0];
  }
  
  // Trata formato DDT00:00:00/MM/YYYY
  const regex1 = /(\d{2})T[\d:]+\/(\d{2})\/(\d{4})/;
  const match = regex1.exec(dateStr);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  
  // Trata formato DD/MM/YYYY
  const regex2 = /(\d{2})\/(\d{2})\/(\d{4})/;
  const match2 = regex2.exec(dateStr);
  if (match2) {
    const [, day, month, year] = match2;
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

