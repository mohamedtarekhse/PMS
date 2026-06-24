import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { usePMRecordDetail, useReviewPM } from '../hooks/useEquipment';
import { Card, Button, Spinner, StatusBadge, Badge } from '../components/ui';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';

export default function PMRecordView() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { isManager, isCoordinator } = useAuth();

  const { data: record, isLoading, refetch } = usePMRecordDetail(recordId!);
  const reviewMutation = useReviewPM();
  const canReview = isManager || isCoordinator;

  const handleReview = async () => {
    try {
      await reviewMutation.mutateAsync(parseInt(recordId!));
      refetch();
    } catch {}
  };

  const handlePrint = () => window.print();

  if (isLoading) return <Spinner />;
  if (!record) return <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>;

  const equipmentName = lang === 'ar' && record.equipment_name_ar ? record.equipment_name_ar : record.equipment_name_en;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> {t('record.printRecord')}
          </Button>
          {canReview && !record.reviewed_at && (
            <Button size="sm" onClick={handleReview} loading={reviewMutation.isLoading}>
              <CheckCircle className="w-4 h-4 mr-1" /> {t('pm.markReviewed')}
            </Button>
          )}
        </div>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{equipmentName}</h1>
            <p className="text-sm text-gray-500">
              {format(parseISO(record.submitted_at), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
          <StatusBadge status={record.overall_status} t={t} />
        </div>
      </Card>

      {/* Info */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('schedule.frequency')}</p>
            <p className="text-sm font-medium">{record.frequency_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('pm.completed')}</p>
            <p className="text-sm font-medium">{record.completed_by}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('pm.accepted')}</p>
            <p className="text-sm font-medium">{record.accepted_by || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">{t('pm.hours')}</p>
            <p className="text-sm font-medium">{record.equipment_hours ?? '-'}</p>
          </div>
        </div>
        {record.reviewed_by && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{t('pm.reviewedBy')}: <span className="font-medium">{record.reviewed_by}</span></p>
          </div>
        )}
      </Card>

      {/* Tasks */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pm.taskResults')}</h2>
      <Card className="mb-6">
        <div className="space-y-3">
          {record.tasks.map((task) => {
            const desc = lang === 'ar' && task.description_ar ? task.description_ar : task.description_en;
            return (
              <div key={task.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{desc}</p>
                  {task.notes && <p className="text-xs text-gray-500 mt-1">{task.notes}</p>}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {task.task_type === 'status' ? (
                    task.value_status === 'ok' ? (
                      <Badge variant="ok">{t('pm.ok')}</Badge>
                    ) : task.value_status === 'not_ok' ? (
                      <Badge variant="issues">{t('pm.notOk')}</Badge>
                    ) : task.value_status === 'na' ? (
                      <Badge variant="pending">{t('pm.na')}</Badge>
                    ) : '-'
                  ) : (
                    <span className="text-sm font-medium">{task.value_reading} {task.unit || ''}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Comments */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pm.comments')}</h2>
      <Card className="mb-6">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.comments || '-'}</p>
      </Card>

      {/* AI Analysis */}
      {(record.ai_analysis || record.ai_recommendations) && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pm.aiAnalysis')}</h2>
          <Card className="mb-6 border-primary-200">
            {record.ai_analysis && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.ai_analysis}</p>
              </div>
            )}
            {record.ai_recommendations && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('pm.recommendations')}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.ai_recommendations}</p>
              </div>
            )}
          </Card>
        </>
      )}

      {!record.ai_analysis && !record.ai_recommendations && (
        <p className="text-sm text-gray-400 italic mb-6">{t('record.noAnalysis')}</p>
      )}
    </div>
  );
}
