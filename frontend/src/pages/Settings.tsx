import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card } from '../components/ui';
import api from '../lib/api';

export default function Settings() {
  const { t, lang, setLang } = useTranslation();
  const { user, isManager } = useAuth();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('technician');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);
    try {
      await api.post('/auth/invite', {
        email: inviteEmail,
        role: inviteRole,
        full_name: inviteFullName,
      });
      setInviteSuccess(t('settings.inviteSent'));
      setInviteEmail('');
      setInviteFullName('');
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const roleLabel = user?.role === 'technician' ? 'Technician' : user?.role === 'coordinator' ? 'Coordinator' : 'Manager';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* Profile */}
        <Card header={t('settings.profile')}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('settings.name')}</p>
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('settings.email')}</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('settings.role')}</p>
              <p className="text-sm font-medium text-gray-900">{roleLabel}</p>
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card header={t('settings.language')}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang('en')}
              className={`px-6 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                lang === 'en' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-6 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                lang === 'ar' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              العربية
            </button>
          </div>
        </Card>

        {/* Change Password */}
        <Card header={t('settings.changePassword')}>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label={t('settings.currentPassword')}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label={t('settings.newPassword')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label={t('settings.confirmNewPassword')}
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
            {passwordError && <p className="text-sm text-danger-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-success-600">{passwordSuccess}</p>}
            <Button type="submit" loading={passwordLoading}>{t('common.save')}</Button>
          </form>
        </Card>

        {/* Invite User (Manager only) */}
        {isManager && (
          <Card header={t('settings.inviteUser')}>
            <form onSubmit={handleInvite} className="space-y-4">
              <Input
                label={t('settings.inviteEmail')}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Input
                label={t('settings.inviteFullName')}
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                required
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.inviteRole')}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="technician">Technician</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-danger-600">{inviteError}</p>}
              {inviteSuccess && <p className="text-sm text-success-600">{inviteSuccess}</p>}
              <Button type="submit" loading={inviteLoading}>{t('settings.sendInvite')}</Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
