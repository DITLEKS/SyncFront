import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DOCX_RENDER_FAILED, OriginalDocxView } from './OriginalDocxView';

const blob = new Blob(['docx'], {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});
const fallback = <p>Плоский текст</p>;

describe('OriginalDocxView', () => {
  it('рендерит файл в контейнер и не показывает плоский текст', async () => {
    const renderDocx = vi.fn((_blob: Blob, host: HTMLElement) => {
      host.textContent = 'Отрисовано';
      return Promise.resolve();
    });
    render(
      <OriginalDocxView
        file={blob}
        loading={false}
        error={null}
        fallback={fallback}
        render={renderDocx}
      />,
    );

    await waitFor(() => expect(screen.getByText('Отрисовано')).toBeInTheDocument());
    expect(renderDocx).toHaveBeenCalledWith(blob, expect.any(HTMLElement));
    expect(screen.queryByText('Плоский текст')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Загрузка исходного файла')).not.toBeInTheDocument();
  });

  it('пока файл грузится — скелетон без плоского текста', () => {
    render(
      <OriginalDocxView
        file={undefined}
        loading
        error={null}
        fallback={fallback}
        render={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Загрузка исходного файла')).toBeInTheDocument();
    expect(screen.queryByText('Плоский текст')).not.toBeInTheDocument();
  });

  it('ошибка загрузки — предупреждение и плоский текст', () => {
    render(
      <OriginalDocxView
        file={undefined}
        loading={false}
        error={new Error('502')}
        fallback={fallback}
        render={vi.fn()}
      />,
    );
    expect(screen.getByText(DOCX_RENDER_FAILED)).toBeInTheDocument();
    expect(screen.getByText('Плоский текст')).toBeInTheDocument();
  });

  it('ошибка рендера — предупреждение и плоский текст', async () => {
    const renderDocx = vi.fn(() => Promise.reject(new Error('bad zip')));
    render(
      <OriginalDocxView
        file={blob}
        loading={false}
        error={null}
        fallback={fallback}
        render={renderDocx}
      />,
    );
    expect(await screen.findByText(DOCX_RENDER_FAILED)).toBeInTheDocument();
    expect(screen.getByText('Плоский текст')).toBeInTheDocument();
  });
});
