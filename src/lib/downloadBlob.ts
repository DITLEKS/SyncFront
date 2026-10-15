/** Сохранить полученный файл без новой вкладки и без прямого доступа к хранилищу. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Не отзываем URL сразу: браузеру нужно успеть начать скачивание.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
