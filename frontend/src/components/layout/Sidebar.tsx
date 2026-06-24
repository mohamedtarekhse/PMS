import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Wrench, CalendarRange, FileText,
  Bell, Settings, Clock, PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useUnreadAlertCount } from '../../hooks/useEquipment';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
  badge?: number;
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTechnician, isCoordinator, isManager } = useAuth();
  const { t } = useTranslation();
  const { data: unreadData } = useUnreadAlertCount();

  const role = isTechnician ? 'technician' : isCoordinator ? 'coordinator' : 'manager';

  const navItems: NavItem[] = [
    { label: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['technician', 'coordinator', 'manager'] },
    { label: t('nav.equipment'), path: '/dashboard', icon: Wrench, roles: ['technician', 'coordinator', 'manager'] },
    { label: t('nav.schedule'), path: '/coordinator/schedule', icon: CalendarRange, roles: ['coordinator'] },
    { label: t('nav.summary'), path: '/summary', icon: FileText, roles: ['coordinator', 'manager'] },
    {
      label: t('nav.alerts'),
      path: '/alerts',
      icon: Bell,
      roles: ['coordinator', 'manager'],
      badge: unreadData?.count || 0,
    },
    { label: t('nav.frequencies'), path: '/coordinator/frequencies', icon: Clock, roles: ['coordinator'] },
    { label: t('nav.settings'), path: '/settings', icon: Settings, roles: ['technician', 'coordinator', 'manager'] },
  ];

  const filtered = navItems.filter((item) => item.roles.includes(role));

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R8</span>
          </div>
          <span className="text-lg font-bold text-gray-900">Rig 8 PM</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {filtered.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="ml-auto bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {role === 'coordinator' && (
        <div className="px-3 mt-4">
          <button
            onClick={() => handleNav('/coordinator/equipment/new')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t('equipment.addNew')}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={onClose} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
          document.documentElement.dir === 'rtl' && 'left-auto right-0',
          document.documentElement.dir === 'rtl' && open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>
    </>
  );
}
