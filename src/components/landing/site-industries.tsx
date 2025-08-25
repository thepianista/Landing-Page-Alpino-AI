'use client';

import { CirclePlus } from 'lucide-react';
import { FC } from 'react';
import { HiOutlineShoppingBag, HiOutlineSparkles } from 'react-icons/hi';
import { HiOutlineBuildingOffice2, HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import Mountain from '@/public/images/mountain.png';
import Image from 'next/image';

const industries = [
  {
    title: 'Handwerk',
    desc: 'Kosteneinsparung durch Automatisierung und bessere Auftragsplanung.',
    icon: <HiOutlineWrenchScrewdriver className="text-green-900 text-2xl" />,
  },
  {
    title: 'Handel',
    desc: 'Bessere Kundenbindung und Umsatzsteigerung durch KI-gestützte Angebote.',
    icon: <HiOutlineShoppingBag className="text-green-900 text-2xl" />,
  },
  {
    title: 'Industrie',
    desc: 'Optimierte Produktionsprozesse und Qualitätskontrolle mit KI.',
    icon: <HiOutlineBuildingOffice2 className="text-green-900 text-2xl" />,
  },
  {
    title: 'Landwirtschaft',
    desc: 'Ertragsprognosen und Ressourcenmanagement durch smarte KI-Lösungen.',
    icon: <HiOutlineSparkles className="text-green-900 text-2xl" />,
  },
];

const Industries: FC = () => {
  return (
    <section className="bg-white pt-24 pb-10 px-4">
      <div className="max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="mb-4 flex flex-row m-auto max-w-3xs gap-2 items-center text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
          <CirclePlus size={16} />
          <span>Zielgerichtet & branchenspezifisch</span>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-2">Branchen, für die wir arbeiten</h2>
        <p className="text-gray-600 mb-16 max-w-2xl mx-auto">
          Unsere Lösungen sind ideal für verschiedene Branchen – praxisnah, modular und sofort einsatzbereit.
        </p>

        {/* Industry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {industries.map((item, idx) => (
            <div key={idx} className="border-l border-gray-100 text-left p-4">
              <div className="mb-3">{item.icon}</div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="relative bg-green-700 text-white rounded-2xl overflow-hidden p-20">
          {/* Imagen fondo superpuesta */}
          <Image
            src={Mountain}
            alt="Mountain"
            className="absolute left-0 bottom-0 w-full max-w-md opacity-10 pointer-events-none"
          />

          {/* Contenido en columnas */}
          <div className="relative z-10 flex flex-col items-end justify-between gap-8">
            {/* Textos */}

            <div className="flex flex-row justify-between items-baseline w-full gap-2">
              <div className="flex justify-start">
                <h3 className="text-2xl md:text-3xl font-semibold mb-2">Warum KI in Ihrem Unternehmen Einsetzen?</h3>
              </div>
              <div className="flex items-end">
                <p className="text-sm md:text-base text-white/80">
                  Erleben Sie unsere Lösungen live oder vereinbaren Sie ein kostenloses Erstgespräch.
                </p>
              </div>
            </div>

            {/* Botón */}
            <button className="bg-white text-green-900 text-sm font-medium px-6 py-3 rounded-full border border-green-900 shadow-sm hover:bg-gray-200 transition flex items-center gap-2 cursor-pointer">
              Jetzt Demo testen <span className="text-lg">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Industries;
