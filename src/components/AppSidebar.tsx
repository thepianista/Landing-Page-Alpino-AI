'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, Home, LogOut } from 'lucide-react';
import Logo from '@/public/Logo.png';
import { usePathname } from 'next/navigation';

export default function AppSidebar() {
  const pathname = usePathname();
  const menuItems = [
    {
      title: 'Bakery',
      icon: Home,
      href: '/home/sellemond-bakery',
    },
    {
      title: 'Social Media',
      icon: BarChart3,
      href: '/home/social-media',
    },
  ];

  return (
    <aside className="w-64 sticky top-0 max-h-screen overflow-y-auto bg-muted border-r flex flex-col">
      <div className="border-b py-2 flex justify-center">
        <Link href={'/home'}>
          <Image src={Logo} alt="logo image" width={178} />
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 w-full px-4 py-2 rounded-md text-left transition
                hover:bg-gray-200 hover:text-accent-foreground
                ${isActive ? 'bg-gray-300 text-accent-foreground font-semibold shadow' : ''}`}
              style={{
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 hover:bg-black/10 transition">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium">
          <LogOut className="h-4 w-4" />
          <span>Salir</span>
        </Link>
      </div>
    </aside>
  );
}
