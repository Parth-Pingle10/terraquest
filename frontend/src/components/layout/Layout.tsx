import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { DesktopSidebar, MobileBottomNav } from './Navigation';

export interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfbf8] dark:bg-[#121613] text-charcoal-900 dark:text-parchment-100 transition-colors">
      <Header />

      <div className="flex-1 flex w-full pb-16 lg:pb-0">
        <DesktopSidebar />

        <main className="flex-1 min-w-0 flex flex-col">
          {children || <Outlet />}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
};
