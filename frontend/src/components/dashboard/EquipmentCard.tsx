import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Card } from '../ui';
import type { Equipment } from '../../hooks/useEquipment';
import { useTranslation } from '../../hooks/useTranslation';
import { format, parseISO, isBefore, addDays } from 'date-fns';

interface Props {
  equipment: Equipment;
}

export default function EquipmentCard({ equipment }: Props) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const getStatusDot = () => {
    if (!equipment.next_pm_date) return 'bg-gray-400';
    const dueDate = parseISO(equipment.next_pm_date);
    const now = new Date();
    if (isBefore(dueDate, now)) return 'bg-danger-500';
    if (isBefore(dueDate, addDays(now, 7))) return 'bg-warning-500';
    return 'bg-success-500';
  };

  const getName = () => {
    if (lang === 'ar' && equipment.name_ar) return equipment.name_ar;
    return equipment.name_en;
  };

  return (
    <Card
      onClick={() => navigate(`/equipment/${equipment.id}`)}
      className="hover:border-primary-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', getStatusDot())} />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {getName()}
            </h3>
          </div>
          {equipment.frequency_name && (
            <p className="text-xs text-gray-500 mb-1">
              {t('schedule.frequency')}: {equipment.frequency_name}
            </p>
          )}
          {equipment.next_pm_date ? (
            <p className="text-xs text-gray-500">
              {t('schedule.nextPM')}: {format(parseISO(equipment.next_pm_date), 'MMM dd, yyyy')}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">{t('common.noData')}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
