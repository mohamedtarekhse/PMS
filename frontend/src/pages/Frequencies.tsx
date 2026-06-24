import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useFrequencies, useCreateFrequency, useUpdateFrequency, useDeleteFrequency } from '../hooks/useEquipment';
import { Card, Button, Spinner, Badge, Modal } from '../components/ui';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import FrequencyForm from '../components/coordinator/FrequencyForm';
import type { Frequency } from '../hooks/useEquipment';

export default function Frequencies() {
  const { t, lang } = useTranslation();
  const { data: frequencies, isLoading } = useFrequencies();
  const createMutation = useCreateFrequency();
  const updateMutation = useUpdateFrequency();
  const deleteMutation = useDeleteFrequency();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Frequency | null>(null);
  const [showDelete, setShowDelete] = useState<Frequency | null>(null);

  const handleSave = (data: Partial<Frequency>) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data }, {
        onSuccess: () => { setShowForm(false); setEditing(null); },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { setShowForm(false); },
      });
    }
  };

  const handleToggle = (freq: Frequency) => {
    updateMutation.mutate({ id: freq.id, is_enabled: !freq.is_enabled });
  };

  const handleDelete = () => {
    if (showDelete) {
      deleteMutation.mutate(showDelete.id, {
        onSuccess: () => setShowDelete(null),
      });
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('coordinator.frequencyManager')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('coordinator.addFrequency')}
        </Button>
      </div>

      <Card>
        <div className="divide-y divide-gray-200">
          {!frequencies || frequencies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>
          ) : (
            frequencies.map((freq) => {
              const name = lang === 'ar' && freq.name_ar ? freq.name_ar : freq.name_en;
              return (
                <div key={freq.id} className="flex items-center justify-between py-4 px-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{name}</span>
                      {!freq.is_enabled && <Badge variant="pending">{t('coordinator.disabled')}</Badge>}
                      {freq.is_custom && <Badge variant="default">Custom</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {freq.type === 'calendar'
                        ? `${t('coordinator.calendar')} — ${t('coordinator.intervalDays')}: ${freq.interval_days}`
                        : `${t('coordinator.hourly')} — ${t('coordinator.intervalHours')}: ${freq.interval_hours}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(freq)}>
                      {freq.is_enabled ? <ToggleRight className="w-4 h-4 text-success-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(freq); setShowForm(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {freq.is_custom && (
                      <Button variant="ghost" size="sm" onClick={() => setShowDelete(freq)}>
                        <Trash2 className="w-4 h-4 text-danger-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? t('coordinator.editFrequency') : t('coordinator.addFrequency')}
        size="md"
      >
        <FrequencyForm
          frequency={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          loading={createMutation.isLoading || updateMutation.isLoading}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} title={t('common.confirm')} size="sm">
        <p className="text-gray-600 mb-4">{t('coordinator.confirmDelete')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isLoading}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
