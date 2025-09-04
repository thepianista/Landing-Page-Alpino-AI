import AppSidebar from '../../components/AppSidebar';
import '../../app/globals.css';
import type { ReactNode } from 'react';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
