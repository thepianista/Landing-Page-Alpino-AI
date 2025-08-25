'use client';

import { LayoutPanelLeft } from 'lucide-react';
import { FC } from 'react';
import Prozesse from '@/public/images/prozesse.png';
import Entscheidungen from '@/public/images/entscheidungen.png';
import Angebotshilfe from '@/public/images/angebotshilfe.png';
import Chatbots from '@/public/images/chatbots.png';
import Workflows from '@/public/images/workflows.png';
import FeatureCard from '@/components/landing/ui/cases-card';

const features = [
  {
    title: 'Automatisierte Prozesse',
    text: 'Manuelle Aufgaben automatisieren, um Zeit und Ressourcen zu sparen.',
    image: Prozesse,
  },
  {
    title: 'Entscheidungsunterstützung',
    text: 'Schneller bessere Entscheidungen treffen mit datenbasierten Empfehlungen.',
    image: Entscheidungen,
  },
  {
    title: 'Angebotshilfe',
    text: 'Automatisierte Angebotserstellung – schneller zum Kundenfeedback.',
    image: Angebotshilfe,
  },
  {
    title: 'Chatbots',
    text: 'Rund um die Uhr verfügbar – für Kunden oder intern.',
    image: Chatbots,
  },
  {
    title: 'Branchenspezifische Workflows',
    text: 'Spezifisch für Ihre Branche – flexibel integrierbar.',
    image: Workflows,
  },
];

const UseCases: FC = () => {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-4 flex flex-row m-auto max-w-[240px] gap-2 items-center text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
          <LayoutPanelLeft size={12} color="gray" />
          <span>Modular. Erweiterbar. Verständlich.</span>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-4 mt-6">
          So setzen wir KI in Ihrem Betrieb ein
        </h2>
        <p className="text-gray-600 mb-16 max-w-2xl mx-auto">
          Automatisierte Prozesse, Entscheidungsunterstützung, Wissenssysteme – genau auf Ihre Bedürfnisse
          zugeschnitten.
        </p>

        {/* Cards Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {features.map((feature, index) => {
            const colSpan = index < 3 ? 'lg:col-span-2' : 'lg:col-span-3';

            return (
              <div key={index} className={`${colSpan}`}>
                <FeatureCard title={feature.title} text={feature.text} image={feature.image} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
