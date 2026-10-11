import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { DesktopSidebar, MobileBottomNav } from './Navigation';

export interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfbf8] dark:bg-[#121613] transition-colors">
      <Header />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 lg:pb-8">
        <DesktopSidebar />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
};
