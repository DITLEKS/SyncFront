import { describe, expect, it } from 'vitest';

import { analysisStateFromJob, isTerminalJobStatus, needsJobLookup } from './analysisState';

const job = { id: 'j1', error_code: null, error_message: null };

describe('analysisStateFromJob', () => {
  it('failed: причина с сервера и возможность повтора', () => {
    expect(
      analysisStateFromJob({
        ...job,
        status: 'failed',
        error_code: 'LLM_UNAVAILABLE',
        error_message: 'Таймаут модели',
      }),
    ).toEqual({
      jobId: 'j1',
      phase: 'failed',
      errorCode: 'LLM_UNAVAILABLE',
      errorMessage: 'Таймаут модели',
      canRetry: true,
    });
  });

  it('failed без кода получает значения по умолчанию как на сервере', () => {
    const state = analysisStateFromJob({ ...job, status: 'failed' });
    expect(state.errorCode).toBe('ANALYSIS_FAILED');
    expect(state.errorMessage).toBe('Ошибка выполнения анализа');
  });

  it('dispatched и processing — обработка без повтора', () => {
    expect(analysisStateFromJob({ ...job, status: 'dispatched' }).phase).toBe('processing');
    expect(analysisStateFromJob({ ...job, status: 'processing' }).canRetry).toBe(false);
  });

  it('cancelled', () => {
    expect(analysisStateFromJob({ ...job, status: 'cancelled' })).toMatchObject({
      phase: 'cancelled',
      canRetry: true,
    });
  });
});

describe('needsJobLookup', () => {
  it('только для draft с задачей и без analysis', () => {
    expect(needsJobLookup({ status: 'draft', current_analysis_job_id: 'j1', analysis: null })).toBe(
      true,
    );
    expect(needsJobLookup({ status: 'draft', current_analysis_job_id: null })).toBe(false);
    expect(needsJobLookup({ status: 'ready', current_analysis_job_id: 'j1' })).toBe(false);
  });
});

describe('isTerminalJobStatus', () => {
  it('различает активные и завершённые задачи', () => {
    expect(isTerminalJobStatus('partial_success')).toBe(true);
    expect(isTerminalJobStatus('dispatched')).toBe(false);
  });
});
