'use client';

import { FC } from 'react';
import HeroBars from './ui/hero-bars';
import HeroLines from './ui/hero-lines';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

const Hero: FC = () => {
  return (
    <div className="relative pt-40 pb-32 bg-white overflow-hidden">
      {/* SVG decorativo */}
      <HeroLines className="absolute top-16 left-1/2 -translate-x-1/2 w-full z-0 pointer-events-none" />

      {/* Contenedor Central */}
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <div className="px-6 text-center">
          <div className="flex flex-col text-center items-center justify-center max-w-52 mx-auto gap-1">
            <HeroBars />
            <div className="inline-flex items-center gap-2 px-4 py-1 text-sm bg-white border border-gray-300 rounded-full shadow-sm mb-5">
              <Sparkles color="gray" size={18} />
              <span className="text-gray-500">Speziell für Südtirol</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-semibold text-green-900 mb-6 leading-tight">
            Künstliche Intelligenz <br /> für Südtirols Betriebe
          </h1>

          <p className="text-gray-600 text-base md:text-lg mb-8">
            Wir unterstützen KMU im Handwerk, Handel und der Industrie mit verständlicher KI zur Automatisierung von
            Abläufen und zur Nutzung internen Wissens.
          </p>

          <Link
            className="bg-green-900 text-white px-6 py-3 rounded-lg shadow hover:bg-green-800 transition"
            href={'/sellemond-bakery'}
          >
            Jetzt kennenlernen
          </Link>
        </div>

        <p className="text-4xl text-gray-700 text-center mt-16">Sicher. Verständlich. Sofort einsetzbar.</p>
        <div className="py-16" />
      </div>
    </div>
  );
};

export default Hero;
