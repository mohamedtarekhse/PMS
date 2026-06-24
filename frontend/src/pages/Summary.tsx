import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useSummaryData } from '../hooks/useEquipment';
import { Card, Input, Select, Button, Spinner, Tabs, StatusBadge, Badge } from '../components/ui';
import { Search, Download, Eye } from 'lucide-react';

export default function Summary() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  }), [search, statusFilter, fromDate, toDate]);

  const { data: summary, isLoading } = useSummaryData(filters);

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'ok', label: t('status.ok') },
    { value: 'issues_found', label: t('status.issues_found') },
    { value: 'needs_review', label: t('status.needs_review') },
    { value: 'overdue', label: t('status.overdue') },
    { value: 'due', label: t('status.due') },
  ];

  const getRowClass = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-success-50 hover:bg-success-100';
      case 'issues_found': return 'bg-danger-50 hover:bg-danger-100';
      case 'needs_review': return 'bg-warning-50 hover:bg-warning-100';
      case 'overdue': return 'bg-orange-50 hover:bg-orange-100';
      default: return 'hover:bg-gray-50';
    }
  };

  const exportCSV = () => {
    if (!summary || summary.length === 0) return;
    const headers = ['Equipment', 'Last PM', 'Status', 'Issues', 'Last Comment'];
    const rows = summary.map((row: any) => {
      const name = lang === 'ar' ? row.name_ar : row.name_en;
      return [name, row.last_pm_date || '', row.overall_status || '', row.flagged_count || 0, row.last_comment || ''].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pm-summary.csv';
    link.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.summary')}</h1>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> {t('common.export')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            className="max-w-[200px]"
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="max-w-[180px]"
          />
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : !summary || summary.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('equipment.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.lastPM')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pm.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pm.flaggedItems')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pm.comments')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summary.map((row: any, idx: number) => {
                  const name = lang === 'ar' && row.name_ar ? row.name_ar : row.name_en;
                  return (
                    <tr key={row.id || idx} className={getRowClass(row.overall_status)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.last_pm_date || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.overall_status ? <StatusBadge status={row.overall_status} t={t} /> : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.flagged_count ?? 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{row.last_comment || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.last_record_id && (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/pm/record/${row.last_record_id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
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
  );
}
