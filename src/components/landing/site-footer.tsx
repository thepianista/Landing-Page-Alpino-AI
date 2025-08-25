'use client';

import { FC } from 'react';
import { HiOutlinePhone } from 'react-icons/hi';
import { HiOutlineEnvelope, HiOutlineMapPin } from 'react-icons/hi2';
import Logo from '@/public/Logo.png';
import Image from 'next/image';

const Footer: FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 text-sm text-gray-600 px-6 py-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Side */}
        <div>
          <Image src={Logo} alt="logo image" width={164} />
          <p className="mb-6">Effizienz durch intelligente Lösungen.</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <HiOutlineMapPin className="mt-0.5 text-green-900" />
              Julius Durst 44, 39042 Brixen
            </li>
            <li className="flex items-start gap-2">
              <HiOutlinePhone className="mt-0.5 text-green-900" />
              +39 353 3767845
            </li>
            <li className="flex items-start gap-2">
              <HiOutlineEnvelope className="mt-0.5 text-green-900" />
              info@alpino-ai.com
            </li>
          </ul>
        </div>

        {/* Right Side: Nav */}
        <div className="md:text-right">
          <nav className="flex flex-col md:flex-row md:justify-end md:gap-6 gap-3 mb-8">
            <a href="#" className="text-gray-700 hover:text-green-900">
              Leistungen
            </a>
            <a href="#" className="text-gray-700 hover:text-green-900">
              Branchen
            </a>
            <a href="#" className="text-gray-700 hover:text-green-900">
              Warum KI?
            </a>
            <a href="#" className="text-gray-700 hover:text-green-900">
              Über Uns
            </a>
            <a href="#" className="text-gray-700 hover:text-green-900">
              Blog
            </a>
          </nav>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-6xl mx-auto mt-8 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
        <span>2025 Alpino AI. Alle Rechte vorbehalten.</span>
        <div className="flex gap-4">
          <a href="#">Terms</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
