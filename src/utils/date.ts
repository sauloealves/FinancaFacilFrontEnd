/**
 * Datas financeiras são datas civis (YYYY-MM-DD)
 * Não devem usar Date() diretamente (timezone)
 */

export function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
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
