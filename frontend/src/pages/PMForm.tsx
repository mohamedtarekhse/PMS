import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useEquipmentDetail, useEquipmentTasks, useEquipmentSchedules, usePMRecords, useSubmitPM } from '../hooks/useEquipment';
import { Button, Card, Spinner, Input, Select, Modal } from '../components/ui';
import TaskRow from '../components/pm/TaskRow';
import CommentsSection from '../components/pm/CommentsSection';
import { ArrowLeft, CheckCircle, FileText, Home } from 'lucide-react';

export default function PMForm() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { user } = useAuth();

  const { data: equipment, isLoading: equipLoading } = useEquipmentDetail(equipmentId!);
  const { data: tasks, isLoading: tasksLoading } = useEquipmentTasks(equipmentId!);
  const { data: schedules } = useEquipmentSchedules(equipmentId!);
  const { data: records } = usePMRecords(equipmentId!);
  const submitMutation = useSubmitPM();

  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [acceptedBy, setAcceptedBy] = useState('');
  const [equipmentHours, setEquipmentHours] = useState('');
  const [comments, setComments] = useState('');
  const [taskValues, setTaskValues] = useState<Record<number, string | number | null>>({});
  const [taskNotes, setTaskNotes] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [flaggedItems, setFlaggedItems] = useState<string[]>([]);

  const lastRecord = records && records.length > 0 ? records[0] : null;
  const lastTasks = lastRecord?.tasks || [];

  useEffect(() => {
    if (schedules && schedules.length > 0 && !selectedFrequency) {
      setSelectedFrequency(schedules[0].frequency_id?.toString() || '');
    }
  }, [schedules, selectedFrequency]);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  }, [tasks]);

  const handleTaskChange = (taskId: number, value: string | number | null) => {
    setTaskValues((prev) => ({ ...prev, [taskId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`task_${taskId}`];
      return next;
    });
  };

  const handleNotesChange = (taskId: number, notes: string) => {
    setTaskNotes((prev) => ({ ...prev, [taskId]: notes }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedFrequency) newErrors.frequency = t('common.required');
    if (!comments.trim()) newErrors.comments = t('common.required');

    sortedTasks.forEach((task) => {
      if (task.is_required) {
        if (task.task_type === 'status' && !taskValues[task.id]) {
          newErrors[`task_${task.id}`] = t('common.required');
        }
        if (task.task_type === 'numeric_reading' && (taskValues[task.id] == null || taskValues[task.id] === '')) {
          newErrors[`task_${task.id}`] = t('common.required');
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    const flagged: string[] = [];
    sortedTasks.forEach((task) => {
      const val = taskValues[task.id];
      if (task.task_type === 'status' && val === 'not_ok') {
        const desc = lang === 'ar' && task.description_ar ? task.description_ar : task.description_en;
        flagged.push(desc);
      }
    });

    try {
      await submitMutation.mutateAsync({
        equipment_id: parseInt(equipmentId!),
        frequency_id: parseInt(selectedFrequency),
        completed_by_id: user!.id,
        accepted_by: acceptedBy,
        equipment_hours: equipmentHours ? parseFloat(equipmentHours) : null,
        comments: comments.trim(),
        tasks: sortedTasks.map((task) => ({
          task_id: task.id,
          value_status: task.task_type === 'status' ? (taskValues[task.id] as string) || null : null,
          value_reading: task.task_type === 'numeric_reading' ? (taskValues[task.id] as number) || null : null,
          notes: taskNotes[task.id] || null,
        })),
      });
      setFlaggedItems(flagged);
      setShowSuccess(true);
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    }
  };

  const getLastValueForTask = (taskId: number) => {
    return lastTasks.find((t) => t.task_id === taskId);
  };

  if (equipLoading || tasksLoading) return <Spinner />;
  if (!equipment) return <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>;

  const name = lang === 'ar' && equipment.name_ar ? equipment.name_ar : equipment.name_en;
  const freqOptions = (schedules || []).map((s: any) => ({
    value: s.frequency_id?.toString() || '',
    label: s.frequency_name || '',
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(`/equipment/${equipmentId}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('pm.submit')}</h1>
      <p className="text-gray-500 mb-6">{name} — {format(new Date(), 'MMM dd, yyyy')}</p>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        {/* Frequency Selection */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('schedule.frequency')}
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              options={freqOptions.length > 0 ? freqOptions : [{ value: '', label: t('common.noData') }]}
              error={errors.frequency}
            />
            <Input
              label={t('pm.completed')}
              value={user?.full_name || ''}
              disabled
            />
            <Input
              label={t('pm.accepted')}
              value={acceptedBy}
              onChange={(e) => setAcceptedBy(e.target.value)}
              placeholder={t('pm.accepted')}
            />
            <Input
              label={t('pm.hours')}
              type="number"
              value={equipmentHours}
              onChange={(e) => setEquipmentHours(e.target.value)}
              placeholder={t('pm.hours')}
            />
          </div>
        </Card>

        {/* Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('pm.taskResults')}</h2>
          {sortedTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('pm.noTasks')}</p>
          ) : (
            sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                value={taskValues[task.id] ?? null}
                onChange={(val) => handleTaskChange(task.id, val)}
                notes={taskNotes[task.id] || ''}
                onNotesChange={(notes) => handleNotesChange(task.id, notes)}
                previousResult={getLastValueForTask(task.id)}
                error={errors[`task_${task.id}`]}
              />
            ))
          )}
        </div>

        {/* Comments */}
        <Card>
          <CommentsSection
            value={comments}
            onChange={setComments}
            error={errors.comments}
          />
        </Card>

        {errors.submit && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(`/equipment/${equipmentId}`)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitMutation.isLoading}>
            {t('pm.submit')}
          </Button>
        </div>
      </form>

      {/* Confirm Dialog */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title={t('common.confirm')} size="sm">
        <p className="text-gray-600 mb-4">{t('pm.confirmSubmit')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>{t('common.cancel')}</Button>
          <Button onClick={confirmSubmit} loading={submitMutation.isLoading}>{t('common.yes')}</Button>
        </div>
      </Modal>

      {/* Success Dialog */}
      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title={t('pm.submitSuccess')} size="sm">
        <div className="text-center py-4">
          <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
          {flaggedItems.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">{t('pm.flaggedItems')}:</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {flaggedItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <Home className="w-4 h-4 mr-2" /> {t('pm.returnDashboard')}
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <FileText className="w-4 h-4 mr-2" /> {t('pm.viewRecord')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
