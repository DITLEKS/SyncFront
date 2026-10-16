import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SuggestionResponse } from '@/api/types';
import type { LocatedSuggestion } from '@/domain/editor/projection';

import { orderSuggestions } from '../model/orderSuggestions';

import { SuggestionsPanel } from './SuggestionsPanel';

const makeSuggestion = (
  id: string,
  text: string,
  status: SuggestionResponse['status'] = 'pending',
) =>
  ({
    id,
    document_id: 'd-0001-4000-8000-000000000000',
    analysis_job_id: 'j-0001-4000-8000-000000000000',
    section_ref: null,
    change_type: 'modify',
    original_text: text,
    suggested_text: text,
    rationale: null,
    confidence_score: null,
    block_id: null,
    start_offset: null,
    end_offset: null,
    status,
    decided_by: null,
    decided_at: null,
    created_at: '2026-10-16T03:00:00Z',
  }) satisfies SuggestionResponse;

const loc = (originOffset: number | null): LocatedSuggestion => ({
  issue: originOffset === null ? 'not_found' : null,
  exportable: originOffset !== null,
  inline: originOffset !== null,
  originOffset,
});

const suggestions = [
  makeSuggestion('late', 'Позже'),
  makeSuggestion('missing-1', 'Без позиции 1'),
  makeSuggestion('early', 'Раньше'),
  makeSuggestion('same', 'Та же позиция'),
  makeSuggestion('missing-2', 'Без позиции 2'),
];
const located = {
  late: loc(20),
  'missing-1': loc(null),
  early: loc(5),
  same: loc(20),
  'missing-2': loc(null),
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof SuggestionsPanel>> = {}) {
  const onSelect = vi.fn();
  const onDecide = vi.fn();
  render(
    <SuggestionsPanel
      suggestions={suggestions}
      statusOf={(s) => s.status}
      unsavedIds={new Set()}
      located={located}
      progress={{
        total: suggestions.length,
        decided: 0,
        pending: suggestions.length,
        accepted: 0,
        rejected: 0,
        percent: 0,
      }}
      selectedId="early"
      onSelect={onSelect}
      canReview
      onDecide={onDecide}
      {...overrides}
    />,
  );
  return { onSelect, onDecide };
}

describe('SuggestionsPanel', () => {
  it('сортирует по позиции и стабильно отправляет непривязанные предложения в конец', () => {
    expect(orderSuggestions(suggestions, located).map((s) => s.id)).toEqual([
      'early',
      'late',
      'same',
      'missing-1',
      'missing-2',
    ]);
  });

  it('применяет фильтр после сортировки', () => {
    renderPanel({
      suggestions: [suggestions[0]!, { ...suggestions[2]!, status: 'accepted' }],
      progress: { total: 2, decided: 1, pending: 1, accepted: 1, rejected: 0, percent: 50 },
    });
    expect(screen.getByText('Позже')).toBeInTheDocument();
    expect(screen.queryByText('Раньше')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Все' }));
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Раньше');
    expect(items[1]).toHaveTextContent('Позже');
  });

  it('переключает выбор стрелками и принимает выбранную правку по Enter', () => {
    const { onSelect, onDecide } = renderPanel();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenCalledWith('late');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(onSelect).toHaveBeenCalledWith('early');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onDecide).toHaveBeenCalledWith('early', 'accepted');
  });

  it.each(['input', 'textarea', 'select', 'button'])('не перехватывает клавиши в %s', (tag) => {
    const { onSelect, onDecide } = renderPanel();
    const element = document.createElement(tag);
    document.body.appendChild(element);
    fireEvent.keyDown(element, { key: 'ArrowDown' });
    fireEvent.keyDown(element, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDecide).not.toHaveBeenCalled();
    element.remove();
  });

  it('не перехватывает клавиши в contenteditable', () => {
    const { onSelect, onDecide } = renderPanel();
    const element = document.createElement('div');
    element.setAttribute('contenteditable', 'true');
    document.body.appendChild(element);
    fireEvent.keyDown(element, { key: 'ArrowDown' });
    fireEvent.keyDown(element, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDecide).not.toHaveBeenCalled();
    element.remove();
  });
});
