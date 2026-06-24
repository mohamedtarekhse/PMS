import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useEquipmentList, useDashboardStats } from '../hooks/useEquipment';
import EquipmentCard from '../components/dashboard/EquipmentCard';
import { Spinner, Input, Tabs, Card, StatusBadge } from '../components/ui';
import { AlertTriangle, Clock, CheckCircle, Wrench } from 'lucide-react';

export default function Dashboard() {
  const { t, lang } = useTranslation();
  const { isCoordinator, isManager } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: equipment, isLoading: equipLoading } = useEquipmentList(
    search ? { search } : statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const isMgmt = isCoordinator || isManager;

  const filterTabs = [
    { key: 'all', label: t('dashboard.filterAll') },
    { key: 'overdue', label: t('dashboard.filterOverdue') },
    { key: 'due', label: t('dashboard.filterDue') },
    { key: 'ok', label: t('dashboard.filterOk') },
    { key: 'issues', label: t('dashboard.filterIssues') },
  ];

  const statCards = [
    { label: t('dashboard.totalEquipment'), value: stats?.total_equipment ?? 0, icon: Wrench, color: 'bg-primary-500' },
    { label: t('dashboard.dueThisWeek'), value: stats?.due_this_week ?? 0, icon: Clock, color: 'bg-warning-500' },
    { label: t('dashboard.overdue'), value: stats?.overdue ?? 0, icon: AlertTriangle, color: 'bg-danger-500' },
    { label: t('dashboard.issuesFound'), value: stats?.issues_found ?? 0, icon: CheckCircle, color: 'bg-success-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard.title')}</h1>

      {/* Stats */}
      {statsLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <Card key={card.label}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Overdue PMs for coordinators/managers */}
      {isMgmt && stats && stats.overdue > 0 && (
        <Card className="mb-6 border-danger-200 bg-danger-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <span className="font-medium text-danger-800">
              {stats.overdue} {t('dashboard.overduePMs')}
            </span>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dashboard.searchEquipment')}
          className="max-w-xs"
        />
        <Tabs tabs={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Equipment Grid */}
      {equipLoading ? (
        <Spinner />
      ) : !equipment || equipment.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('dashboard.noEquipment')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipment.map((eq) => (
            <EquipmentCard key={eq.id} equipment={eq} />
          ))}
        </div>
      )}
    </div>
  );
}
