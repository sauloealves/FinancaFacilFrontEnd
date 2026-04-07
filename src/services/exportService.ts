import api from "./api";

const DEFAULT_EXPORT_BACKUP_ENDPOINT = (
  (import.meta.env.VITE_EXPORT_BACKUP_ENDPOINT as string | undefined)?.trim() ||
  "/export/backup"
).replace(/\/+$/, "");

type UserBackupFile = {
  fileName: string;
  fileBlob: Blob;
};

function sanitizeFileName(fileName: string) {
  return fileName.replaceAll(/[\\/:*?"<>|]/g, "-");
}

function extractFileName(contentDispositionHeader?: string) {
  if (!contentDispositionHeader) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDispositionHeader);
  if (utf8Match?.[1]) {
    return sanitizeFileName(decodeURIComponent(utf8Match[1]));
  }

  const basicMatch = /filename="?([^";]+)"?/i.exec(contentDispositionHeader);
  if (basicMatch?.[1]) {
    return sanitizeFileName(basicMatch[1]);
  }

  return null;
}

export async function exportUserBackup(): Promise<UserBackupFile> {
  const response = await api.get<Blob>(DEFAULT_EXPORT_BACKUP_ENDPOINT, {
    responseType: "blob",
  });

  return {
    fileBlob: response.data,
    fileName: extractFileName(response.headers["content-disposition"]) || `backup-financeiro-${new Date().toISOString().slice(0, 19).replaceAll(/[:T]/g, "-")}.xlsx`,
  };
}