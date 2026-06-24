import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../hooks/useEquipment';
import { Card, Button, Spinner, Tabs, Badge } from '../components/ui';
import { AlertTriangle, Info, AlertCircle, CheckCheck, Eye } from 'lucide-react';

export default function Alerts() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('unread');
  const { data: unreadAlerts, isLoading: unreadLoading } = useAlerts({ unread: tab === 'unread' });
  const { data: allAlerts, isLoading: allLoading } = useAlerts();
  const markReadMutation = useMarkAlertRead();
  const markAllReadMutation = useMarkAllAlertsRead();

  const alerts = tab === 'unread' ? unreadAlerts : allAlerts;
  const isLoading = tab === 'unread' ? unreadLoading : allLoading;

  const tabs = [
    { key: 'unread', label: t('alert.unread') },
    { key: 'all', label: t('alert.all') },
  ];

  const handleMarkRead = (alertId: number) => {
    markReadMutation.mutate(alertId);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-5 h-5 text-danger-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      default: return <Info className="w-5 h-5 text-primary-500" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('alert.title')}</h1>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead} loading={markAllReadMutation.isLoading}>
          <CheckCheck className="w-4 h-4 mr-1" /> {t('alert.markAllRead')}
        </Button>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <Spinner />
        ) : !alerts || alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('alert.noAlerts')}</div>
        ) : (
          alerts.map((alert: any) => (
            <Card key={alert.id} className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    {alert.equipment_name && (
                      <p className="text-xs text-gray-400 mt-1">{alert.equipment_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(alert.created_at)}</span>
                    {!alert.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(alert.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {alert.record_id && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/pm/record/${alert.record_id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
