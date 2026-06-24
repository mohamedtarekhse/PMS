import React from 'react';
import { clsx } from 'clsx';
import type { EquipmentTask, TaskResult } from '../../hooks/useEquipment';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  task: EquipmentTask;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  previousResult?: TaskResult;
  error?: string;
}

export default function TaskRow({ task, value, onChange, notes, onNotesChange, previousResult, error }: Props) {
  const { t, lang } = useTranslation();

  const description = lang === 'ar' && task.description_ar ? task.description_ar : task.description_en;

  return (
    <div className={clsx('border rounded-lg p-4', error ? 'border-danger-300 bg-danger-50' : 'border-gray-200')}>
      <div className="flex items-start justify-between mb-3">
        <label className="text-sm font-medium text-gray-900">
          {description}
          {task.is_required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      </div>

      {task.task_type === 'status' && (
        <div className="flex gap-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {['ok', 'not_ok', 'na'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                value === opt
                  ? opt === 'ok'
                    ? 'border-success-500 bg-success-50 text-success-700'
                    : opt === 'not_ok'
                    ? 'border-danger-500 bg-danger-50 text-danger-700'
                    : 'border-gray-400 bg-gray-50 text-gray-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              )}
            >
              {opt === 'ok' ? t('pm.ok') : opt === 'not_ok' ? t('pm.notOk') : t('pm.na')}
            </button>
          ))}
        </div>
      )}

      {task.task_type === 'numeric_reading' && (
        <div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
              className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('pm.reading')}
            />
            {task.unit && <span className="text-sm text-gray-500">{task.unit}</span>}
          </div>
          {previousResult?.value_reading != null && (
            <p className="mt-1 text-xs text-gray-400">
              {t('pm.lastReading')}: {previousResult.value_reading} {task.unit || ''}
            </p>
          )}
        </div>
      )}

      {task.has_notes && (
        <div className="mt-3">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder={t('pm.notes')}
          />
        </div>
      )}

      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
