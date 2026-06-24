import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';

export interface Equipment {
  id: number;
  name_en: string;
  name_ar: string;
  model: string;
  make: string;
  serial_number: string;
  location: string;
  status: string;
  next_pm_date: string | null;
  frequency_name: string | null;
  frequency_id: number | null;
}

export interface EquipmentTask {
  id: number;
  description_en: string;
  description_ar: string;
  task_type: 'status' | 'numeric_reading';
  unit: string | null;
  has_notes: boolean;
  is_required: boolean;
  sort_order: number;
}

export interface TaskResult {
  id: number;
  task_id: number;
  description_en: string;
  description_ar: string;
  task_type: 'status' | 'numeric_reading';
  value_status: 'ok' | 'not_ok' | 'na' | null;
  value_reading: number | null;
  unit: string | null;
  notes: string | null;
  has_notes: boolean;
  is_required: boolean;
}

export interface PMRecord {
  id: number;
  equipment_id: number;
  equipment_name_en: string;
  equipment_name_ar: string;
  frequency_id: number;
  frequency_name: string;
  completed_by: string;
  completed_by_id: number;
  accepted_by: string | null;
  accepted_by_id: number | null;
  equipment_hours: number | null;
  comments: string;
  overall_status: 'ok' | 'issues_found' | 'needs_review';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  tasks: TaskResult[];
  ai_analysis: string | null;
  ai_recommendations: string | null;
}

export interface Frequency {
  id: number;
  name_en: string;
  name_ar: string;
  type: 'calendar' | 'hourly';
  interval_days: number | null;
  interval_hours: number | null;
  description: string | null;
  is_enabled: boolean;
  is_custom: boolean;
}

export interface DashboardStats {
  total_equipment: number;
  due_this_week: number;
  overdue: number;
  issues_found: number;
}

export interface Alert {
  id: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  type: string;
  is_read: boolean;
  created_at: string;
  equipment_name: string | null;
  record_id: number | null;
}

export interface EquipmentFilters {
  search?: string;
  status?: string;
}

export function useEquipmentList(filters?: EquipmentFilters) {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  return useQuery<Equipment[]>(['equipment', filters], () =>
    api.get<Equipment[]>('/equipment', params)
  );
}

export function useEquipmentDetail(id: number | string) {
  return useQuery<Equipment>(['equipment', id], () =>
    api.get<Equipment>(`/equipment/${id}`), { enabled: !!id }
  );
}

export function useEquipmentTasks(equipmentId: number | string) {
  return useQuery<EquipmentTask[]>(['equipment-tasks', equipmentId], () =>
    api.get<EquipmentTask[]>(`/equipment/${equipmentId}/tasks`), { enabled: !!equipmentId }
  );
}

export function useEquipmentSchedules(equipmentId: number | string) {
  return useQuery<any[]>(['equipment-schedules', equipmentId], () =>
    api.get<any[]>(`/equipment/${equipmentId}/schedules`), { enabled: !!equipmentId }
  );
}

export function usePMRecords(equipmentId: number | string) {
  return useQuery<PMRecord[]>(['pm-records', equipmentId], () =>
    api.get<PMRecord[]>(`/equipment/${equipmentId}/records`), { enabled: !!equipmentId }
  );
}

export function usePMRecordDetail(recordId: number | string) {
  return useQuery<PMRecord>(['pm-record', recordId], () =>
    api.get<PMRecord>(`/pm/${recordId}`), { enabled: !!recordId }
  );
}

export function useSubmitPM() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: {
      equipment_id: number;
      frequency_id: number;
      completed_by_id: number;
      accepted_by: string;
      equipment_hours: number | null;
      comments: string;
      tasks: {
        task_id: number;
        value_status?: string | null;
        value_reading?: number | null;
        notes?: string | null;
      }[];
    }) => api.post('/pm', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('equipment');
        queryClient.invalidateQueries('pm-records');
        queryClient.invalidateQueries('equipment-schedules');
      },
    }
  );
}

export function useReviewPM() {
  const queryClient = useQueryClient();
  return useMutation(
    (recordId: number) => api.post(`/pm/${recordId}/review`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pm-record');
      },
    }
  );
}

export function useDashboardStats() {
  return useQuery<DashboardStats>('dashboard-stats', () =>
    api.get<DashboardStats>('/dashboard/stats')
  );
}

export function useAlerts(params?: { type?: string; unread?: boolean }) {
  const queryParams: Record<string, string> = {};
  if (params?.type) queryParams.type = params.type;
  if (params?.unread) queryParams.unread = 'true';
  return useQuery<Alert[]>(['alerts', params], () =>
    api.get<Alert[]>('/alerts', queryParams)
  );
}

export function useUnreadAlertCount() {
  return useQuery<{ count: number }>('alerts-unread', () =>
    api.get<{ count: number }>('/alerts/count')
  );
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation(
    (alertId: number) => api.post(`/alerts/${alertId}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts');
        queryClient.invalidateQueries('alerts-unread');
      },
    }
  );
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation(
    () => api.post('/alerts/read-all'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts');
        queryClient.invalidateQueries('alerts-unread');
      },
    }
  );
}

export function useFrequencies() {
  return useQuery<Frequency[]>('frequencies', () =>
    api.get<Frequency[]>('/frequencies')
  );
}

export function useCreateFrequency() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: Partial<Frequency>) => api.post('/frequencies', data),
    { onSuccess: () => queryClient.invalidateQueries('frequencies') }
  );
}

export function useUpdateFrequency() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, ...data }: Partial<Frequency> & { id: number }) => api.put(`/frequencies/${id}`, data),
    { onSuccess: () => queryClient.invalidateQueries('frequencies') }
  );
}

export function useDeleteFrequency() {
  const queryClient = useQueryClient();
  return useMutation(
    (id: number) => api.delete(`/frequencies/${id}`),
    { onSuccess: () => queryClient.invalidateQueries('frequencies') }
  );
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: any) => api.post('/equipment', data),
    { onSuccess: () => queryClient.invalidateQueries('equipment') }
  );
}

export function useScheduleData() {
  return useQuery<any[]>('schedule-data', () =>
    api.get<any[]>('/pm/schedule')
  );
}

export function useAssignSchedule() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: { schedule_id: number; assigned_to_id: number }) => api.post('/pm/schedule/assign', data),
    { onSuccess: () => queryClient.invalidateQueries('schedule-data') }
  );
}

export function useRecalculateDates() {
  const queryClient = useQueryClient();
  return useMutation(
    () => api.post('/pm/schedule/recalculate'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('schedule-data');
        queryClient.invalidateQueries('equipment');
      },
    }
  );
}

export function useSummaryData(filters?: { status?: string; from?: string; to?: string; search?: string }) {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.search) params.search = filters.search;
  return useQuery<any[]>(['summary', filters], () =>
    api.get<any[]>('/pm/summary', params)
  );
}
