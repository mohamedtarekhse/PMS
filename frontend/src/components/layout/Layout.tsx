import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggle = () => setSidebarOpen(!sidebarOpen);
  const handleClose = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={handleClose} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={handleToggle} sidebarOpen={sidebarOpen} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
