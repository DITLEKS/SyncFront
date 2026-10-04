/** Короткая подпись формата документа для списков. */
const FORMAT_LABELS: Record<string, string> = {
  docx: 'DOCX',
  markdown: 'MD',
  txt: 'TXT',
};

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format.toUpperCase();
}
