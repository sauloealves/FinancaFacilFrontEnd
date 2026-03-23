import api, { getErrorMessage } from "./api";

export type ImportedInvoiceItem = {
  date?: string;
  description?: string;
  amount?: number;
};

const DEFAULT_INVOICE_IMPORT_ENDPOINT = (
  (import.meta.env.VITE_INVOICE_IMPORT_ENDPOINT as string | undefined)?.trim() ||
  "/invoices/import-invoice" 
).replace(/\/+$/, "");

export async function importInvoiceDocument(file: File): Promise<ImportedInvoiceItem[]> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await api.post<ImportedInvoiceItem[]>(DEFAULT_INVOICE_IMPORT_ENDPOINT, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Não foi possível importar o arquivo bancário."));
  }
}