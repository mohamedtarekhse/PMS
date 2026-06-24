import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function CommentsSection({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const maxChars = 1000;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {t('pm.suggestions')} <span className="text-danger-500">*</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={maxChars}
        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
        placeholder={t('pm.suggestions')}
      />
      <div className="flex justify-between mt-1">
        {error ? (
          <p className="text-sm text-danger-600">{error}</p>
        ) : <div />}
        <p className="text-xs text-gray-400">{value.length}/{maxChars}</p>
      </div>
    </div>
  );
}
