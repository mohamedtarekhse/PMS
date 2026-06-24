import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useEquipmentDetail, useEquipmentSchedules, usePMRecords } from '../hooks/useEquipment';
import { Card, Button, Spinner, StatusBadge, Table, Badge } from '../components/ui';
import { ArrowLeft, Plus, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { isTechnician, isCoordinator } = useAuth();

  const { data: equipment, isLoading: equipLoading } = useEquipmentDetail(id!);
  const { data: schedules, isLoading: schedLoading } = useEquipmentSchedules(id!);
  const { data: records, isLoading: recordsLoading } = usePMRecords(id!);

  const canSubmit = isTechnician || isCoordinator;

  if (equipLoading) return <Spinner />;
  if (!equipment) return <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>;

  const name = lang === 'ar' && equipment.name_ar ? equipment.name_ar : equipment.name_en;

  const scheduleColumns = [
    { key: 'frequency_name', header: t('schedule.frequency') },
    { key: 'last_pm_date', header: t('schedule.lastPM'),
      render: (row: any) => row.last_pm_date ? format(parseISO(row.last_pm_date), 'MMM dd, yyyy') : '-' },
    { key: 'next_due_date', header: t('schedule.nextPM'),
      render: (row: any) => row.next_due_date ? format(parseISO(row.next_due_date), 'MMM dd, yyyy') : '-' },
  ];

  const recordColumns = [
    { key: 'submitted_at', header: t('pm.submittedAt'),
      render: (row: any) => format(parseISO(row.submitted_at), 'MMM dd, yyyy HH:mm') },
    { key: 'frequency_name', header: t('schedule.frequency') },
    { key: 'completed_by', header: t('pm.completed') },
    { key: 'overall_status', header: t('pm.overallStatus'),
      render: (row: any) => <StatusBadge status={row.overall_status} t={t} /> },
    { key: 'actions', header: t('common.actions'),
      render: (row: any) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/pm/record/${row.id}`); }}>
          <Eye className="w-4 h-4" />
        </Button>
      ) },
  ];

  return (
    <div>
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        {canSubmit && (
          <Button onClick={() => navigate(`/pm/${id}`)}>
            <Plus className="w-4 h-4 mr-2" /> {t('pm.newPM')}
          </Button>
        )}
      </div>

      {/* Equipment Info */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('equipment.model')}</p>
            <p className="text-sm font-medium text-gray-900">{equipment.model || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('equipment.make')}</p>
            <p className="text-sm font-medium text-gray-900">{equipment.make || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('equipment.serialNumber')}</p>
            <p className="text-sm font-medium text-gray-900">{equipment.serial_number || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('equipment.location')}</p>
            <p className="text-sm font-medium text-gray-900">{equipment.location || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Schedules */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('schedule.frequency')}</h2>
      {schedLoading ? <Spinner /> : (
        <Card className="mb-6">
          <Table columns={scheduleColumns} data={schedules || []} />
        </Card>
      )}

      {/* PM History */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pm.pmHistory')}</h2>
      {recordsLoading ? <Spinner /> : (
        <Card>
          <Table columns={recordColumns} data={records || []} />
        </Card>
      )}
    </div>
  );
}
