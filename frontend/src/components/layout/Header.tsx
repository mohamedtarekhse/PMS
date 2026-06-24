import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui';

interface Props {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({ onToggleSidebar, sidebarOpen }: Props) {
  const { user, logout, isTechnician, isCoordinator, isManager } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();

  const roleLabel = isTechnician ? 'Technician' : isCoordinator ? 'Coordinator' : 'Manager';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R8</span>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">Rig 8 PM</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{roleLabel}</p>
            </div>
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500">
            <LogOut className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{t('auth.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
