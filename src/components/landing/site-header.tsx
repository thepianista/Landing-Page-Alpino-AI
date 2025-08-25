'use client';

import { FC } from 'react';
import Hero from '@/components/landing/site-hero';
import Image from 'next/image';
import Logo from '@/public/Logo.png';

const links = [
  { href: '#', label: 'Leistungen' },
  { href: '#', label: 'Branchen' },
  { href: '#', label: 'Warum KI?' },
  { href: '#', label: 'Über uns' },
  { href: '#', label: 'Blog' },
];

const Header: FC = () => {
  return (
    <div className="relative">
      <header className="fixed top-6 left-1/2 transform -translate-x-1/2 w-[95%] max-w-7xl bg-white rounded-xl shadow-lg z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Image src={Logo} alt="logo image" width={164} />
        </div>
        <nav className="flex space-x-6 text-gray-700 font-medium">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-green-800 text-md transition">
              {link.label}
            </a>
          ))}
        </nav>
        <button className="bg-green-800 text-white text-md px-5 py-2 rounded-lg shadow-md hover:bg-green-900 transition cursor-pointer">
          Jetzt beraten lassen
        </button>
      </header>
      <Hero />
    </div>
  );
};

export default Header;
