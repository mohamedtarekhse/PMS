import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import EquipmentDetail from './pages/EquipmentDetail';
import PMForm from './pages/PMForm';
import PMRecordView from './pages/PMRecordView';
import Summary from './pages/Summary';
import Alerts from './pages/Alerts';
import CoordinatorSchedule from './pages/CoordinatorSchedule';
import NewEquipment from './pages/NewEquipment';
import Frequencies from './pages/Frequencies';
import Settings from './pages/Settings';
import { Spinner } from './components/ui';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      {/* Protected routes wrapped in Layout */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
        <Route path="/pm/:equipmentId" element={<PMForm />} />
        <Route path="/pm/record/:recordId" element={<PMRecordView />} />
        <Route
          path="/summary"
          element={
            <RoleGuard roles={['coordinator', 'manager']}>
              <Summary />
            </RoleGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <RoleGuard roles={['coordinator', 'manager']}>
              <Alerts />
            </RoleGuard>
          }
        />
        <Route
          path="/coordinator/schedule"
          element={
            <RoleGuard roles={['coordinator']}>
              <CoordinatorSchedule />
            </RoleGuard>
          }
        />
        <Route
          path="/coordinator/equipment/new"
          element={
            <RoleGuard roles={['coordinator']}>
              <NewEquipment />
            </RoleGuard>
          }
        />
        <Route
          path="/coordinator/frequencies"
          element={
            <RoleGuard roles={['coordinator']}>
              <Frequencies />
            </RoleGuard>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
