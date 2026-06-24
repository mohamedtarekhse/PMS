import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useScheduleData, useRecalculateDates } from '../hooks/useEquipment';
import { Card, Button, Spinner, Tabs, Badge, Modal, Input, Select } from '../components/ui';
import { Calendar, RefreshCw, UserCheck } from 'lucide-react';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';

export default function CoordinatorSchedule() {
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState('upcoming');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [showAssign, setShowAssign] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [assignEmail, setAssignEmail] = useState('');

  const { data: schedules, isLoading } = useScheduleData();
  const recalcMutation = useRecalculateDates();

  const tabs = [
    { key: 'upcoming', label: t('schedule.upcoming') },
    { key: 'overdue', label: t('schedule.overdue') },
    { key: 'all', label: t('schedule.allSchedule') },
  ];

  const filtered = React.useMemo(() => {
    if (!schedules) return [];
    const now = new Date();
    return schedules.filter((s: any) => {
      if (tab === 'upcoming') {
        return s.next_due_date && !isBefore(parseISO(s.next_due_date), now);
      }
      if (tab === 'overdue') {
        return s.next_due_date && isBefore(parseISO(s.next_due_date), now);
      }
      return true;
    });
  }, [schedules, tab]);

  const getDaysColor = (days: number) => {
    if (days < 0) return 'text-danger-600 font-bold';
    if (days <= 7) return 'text-warning-600 font-bold';
    return 'text-gray-600';
  };

  const handleAssign = () => {
    setShowAssign(true);
  };

  const handleRecalculate = () => {
    recalcMutation.mutate();
  };

  // Generate next 30 days for calendar
  const calendarDays = React.useMemo(() => {
    const days: { date: Date; label: string; items: any[] }[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const items = (schedules || []).filter((s: any) => {
        if (!s.next_due_date) return false;
        const dueDate = parseISO(s.next_due_date);
        return dueDate.toDateString() === date.toDateString();
      });
      days.push({
        date,
        label: format(date, 'MMM dd'),
        items,
      });
    }
    return days;
  }, [schedules]);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.schedule')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
            {viewMode === 'table' ? (
              <><Calendar className="w-4 h-4 mr-1" /> {t('schedule.calendar')}</>
            ) : (
              <>{t('schedule.table')}</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecalculate} loading={recalcMutation.isLoading}>
            <RefreshCw className="w-4 h-4 mr-1" /> {t('schedule.recalulate')}
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-6">
        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {calendarDays.map((day, i) => (
              <Card key={i} className={day.items.length > 0 ? 'border-primary-300 bg-primary-50' : ''}>
                <p className="text-xs font-medium text-gray-500 mb-1">{day.label}</p>
                {day.items.length > 0 ? (
                  <div className="space-y-1">
                    {day.items.map((item: any, j: number) => (
                      <p key={j} className="text-xs text-gray-700 truncate">
                        {lang === 'ar' && item.name_ar ? item.name_ar : item.name_en}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300">-</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('equipment.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.frequency')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.lastPM')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.nextPM')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.daysUntilDue')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.assignedTo')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((s: any, idx: number) => {
                    const name = lang === 'ar' && s.name_ar ? s.name_ar : s.name_en;
                    const days = s.next_due_date ? differenceInDays(parseISO(s.next_due_date), new Date()) : null;
                    return (
                      <tr key={s.id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.frequency_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.last_pm_date ? format(parseISO(s.last_pm_date), 'MMM dd, yyyy') : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.next_due_date ? format(parseISO(s.next_due_date), 'MMM dd, yyyy') : '-'}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${days !== null ? getDaysColor(days) : 'text-gray-400'}`}>
                          {days !== null ? (days < 0 ? `${Math.abs(days)}d ${t('schedule.overdue')}` : `${days}d`) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.assigned_to_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedSchedule(s); setShowAssign(true); }}>
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title={t('schedule.assignTechnician')} size="sm">
        <div className="space-y-4">
          <Input
            label={t('auth.email')}
            value={assignEmail}
            onChange={(e) => setAssignEmail(e.target.value)}
            placeholder="tech@example.com"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAssign(false)}>{t('common.cancel')}</Button>
            <Button>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
