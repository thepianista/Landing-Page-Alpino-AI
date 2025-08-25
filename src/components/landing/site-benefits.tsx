'use client';

import { FC } from 'react';
import { FaClock, FaComments, FaShieldAlt, FaWrench } from 'react-icons/fa';

const features = [
  {
    icon: <FaComments className="text-green-900 text-2xl" />,
    title: 'Einfach bedienbar',
    text: 'Keine Vorkenntnisse nötig – Ihr Team nutzt KI direkt im Chat.',
  },
  {
    icon: <FaShieldAlt className="text-green-900 text-2xl" />,
    title: 'Datensicher & DSGVO-konform',
    text: 'Auf Wunsch lokal gehostet – Ihre Daten bleiben geschützt.',
  },
  {
    icon: <FaClock className="text-green-900 text-2xl" />,
    title: 'Spart Zeit & Nerven',
    text: 'Informationen, Anleitungen & Berichte in Sekunden abrufen.',
  },
  {
    icon: <FaWrench className="text-green-900 text-2xl" />,
    title: 'Für Ihren Betrieb gemacht',
    text: 'Individuelle Konfiguration – exakt für Ihre Branche.',
  },
];

const Benefits: FC = () => {
  return (
    <section className="bg-white py-24 px-4 relative z-10">
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="mb-4 inline-block items-center text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
          <span>Warum wir?</span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-4">Ihre Vorteile auf einen Blick</h2>
        <p className="text-gray-600 mb-16 max-w-2xl mx-auto">
          Entdecken Sie, wie unsere Lösung Ihnen hilft, Prozesse zu optimieren, Kosten zu senken und Ihre digitalen
          Abläufe zukunftssicher zu gestalten.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 text-left">
          {features.map((feature, idx) => (
            <div className="flex border-l border-gray-200 pl-4 max-w-sm" key={idx}>
              <div className="flex flex-col gap-2">
                {feature.icon}
                <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
