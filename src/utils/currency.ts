/**
 * Converte string pt-BR para number
 * "1.234,56" → 1234.56
 */
export function parseBRL(value: string): number {
  return Number(
    value
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

/**
 * Formata number para string editável
 * 1234.56 → "1.234,56"
 */
export function formatBRLInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBRLInputSigned(value: number): string {
  console.log("formatBRLInputSigned", value);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  return (
    sign +
    abs.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}


export function maskBRLInput(value: string): string {
  const isNegative = value.startsWith("-");
  const numeric = value.replace(/[^\d]/g, "");

  if (!numeric) return isNegative ? "-" : "";

  const number = Number(numeric) / 100;

  const formatted = number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? "-" + formatted : formatted;
}

