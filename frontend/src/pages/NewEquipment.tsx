import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useFrequencies, useCreateEquipment } from '../hooks/useEquipment';
import { Button, Input, Card, Spinner } from '../components/ui';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewEquipment() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { data: frequencies, isLoading: freqLoading } = useFrequencies();
  const createMutation = useCreateEquipment();

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [model, setModel] = useState('');
  const [make, setMake] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [selectedFreqs, setSelectedFreqs] = useState<number[]>([]);
  const [error, setError] = useState('');

  const toggleFreq = (id: number) => {
    setSelectedFreqs((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nameEn.trim() || !nameAr.trim()) {
      setError('Name is required in both languages');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name_en: nameEn,
        name_ar: nameAr,
        model,
        make,
        serial_number: serialNumber,
        location,
        template_id: templateId ? parseInt(templateId) : null,
        frequency_ids: selectedFreqs,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('coordinator.newEquipment')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Input
              label={t('equipment.nameEn')}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
            />
            <Input
              label={t('equipment.nameAr')}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('equipment.model')} value={model} onChange={(e) => setModel(e.target.value)} />
              <Input label={t('equipment.make')} value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <Input label={t('equipment.serialNumber')} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            <Input label={t('equipment.location')} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </Card>

        {/* Template */}
        <Card header={t('equipment.template')}>
          <div className="space-y-3">
            {['Standard Checklist', 'Pump Checklist', 'Engine Checklist'].map((tpl) => (
              <label key={tpl} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  value={tpl.toLowerCase().replace(/\s+/g, '_')}
                  checked={templateId === tpl.toLowerCase().replace(/\s+/g, '_')}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{tpl}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Frequency Assignment */}
        <Card header={t('equipment.frequencies')}>
          {freqLoading ? (
            <Spinner size="sm" />
          ) : !frequencies || frequencies.length === 0 ? (
            <p className="text-sm text-gray-500">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {frequencies.map((freq) => (
                <label key={freq.id} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedFreqs.includes(freq.id)}
                    onChange={() => toggleFreq(freq.id)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    {lang === 'ar' && freq.name_ar ? freq.name_ar : freq.name_en}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>{t('common.cancel')}</Button>
          <Button type="submit" loading={createMutation.isLoading}>
            <Save className="w-4 h-4 mr-2" /> {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
