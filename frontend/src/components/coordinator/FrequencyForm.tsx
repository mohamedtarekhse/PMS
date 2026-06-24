import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import type { Frequency } from '../../hooks/useEquipment';

interface Props {
  frequency?: Frequency | null;
  onSave: (data: Partial<Frequency>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function FrequencyForm({ frequency, onSave, onCancel, loading }: Props) {
  const { t } = useTranslation();
  const [nameEn, setNameEn] = useState(frequency?.name_en || '');
  const [nameAr, setNameAr] = useState(frequency?.name_ar || '');
  const [type, setType] = useState<'calendar' | 'hourly'>(frequency?.type || 'calendar');
  const [intervalDays, setIntervalDays] = useState(frequency?.interval_days?.toString() || '');
  const [intervalHours, setIntervalHours] = useState(frequency?.interval_hours?.toString() || '');
  const [description, setDescription] = useState(frequency?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name_en: nameEn,
      name_ar: nameAr,
      type,
      interval_days: type === 'calendar' ? parseInt(intervalDays) || null : null,
      interval_hours: type === 'hourly' ? parseInt(intervalHours) || null : null,
      description: description || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('coordinator.frequencyNameEn')}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        required
      />
      <Input
        label={t('coordinator.frequencyNameAr')}
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        required
      />
      <Select
        label={t('coordinator.frequencyType')}
        value={type}
        onChange={(e) => setType(e.target.value as 'calendar' | 'hourly')}
        options={[
          { value: 'calendar', label: t('coordinator.calendar') },
          { value: 'hourly', label: t('coordinator.hourly') },
        ]}
      />
      {type === 'calendar' && (
        <Input
          label={t('coordinator.intervalDays')}
          type="number"
          min="1"
          value={intervalDays}
          onChange={(e) => setIntervalDays(e.target.value)}
          required
        />
      )}
      {type === 'hourly' && (
        <Input
          label={t('coordinator.intervalHours')}
          type="number"
          min="1"
          value={intervalHours}
          onChange={(e) => setIntervalHours(e.target.value)}
          required
        />
      )}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('coordinator.description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" loading={loading}>{t('common.save')}</Button>
      </div>
    </form>
  );
}
