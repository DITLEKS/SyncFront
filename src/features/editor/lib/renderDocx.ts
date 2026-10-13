/**
 * Рендер .docx в HTML библиотекой docx-preview. Библиотека грузится лениво:
 * она нужна только в режиме «Оригинал» и только для Word-документов.
 */
export async function renderDocx(blob: Blob, container: HTMLElement): Promise<void> {
  const { renderAsync } = await import('docx-preview');
  await renderAsync(blob, container, undefined, {
    className: 'docx',
    // Без «листов» фиксированной ширины: текст течёт по ширине статьи, как и остальные режимы.
    inWrapper: false,
    ignoreWidth: true,
    ignoreHeight: true,
    breakPages: false,
    ignoreLastRenderedPageBreak: true,
    renderHeaders: false,
    renderFooters: false,
    useBase64URL: true,
  });
}
