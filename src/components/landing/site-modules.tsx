'use client';

import {
  BadgeEuro,
  BarChart,
  Bell,
  Bot,
  Brain,
  Briefcase,
  Calculator,
  Euro,
  FileWarning,
  FolderLock,
  Layers,
  Leaf,
  MessageCircle,
  Mic,
  Newspaper,
  PencilRuler,
  RefreshCcw,
  Search,
  ToolCase,
  TriangleAlert,
  User,
} from 'lucide-react';
import { FC, useState } from 'react';

const modules = [
  {
    label: 'Angebotsautomatisierung',
    description: 'Schneller zu besseren Angeboten, weniger manuelle Arbeit',
    icon: <ToolCase size={16} color="black" />,
    items: [
      {
        icon: <Mic size={16} color="black" />,
        text: 'Voicebot für automatische Angebotserstellung',
      },
      {
        icon: <Newspaper size={16} color="black" />,
        text: 'Intelligente Angebotstexte auf Basis von Kundendaten',
      },
      {
        icon: <RefreshCcw size={16} color="black" />,
        text: 'Nachkalkulation mit Echtzeit-Abgleich',
      },
    ],
  },
  {
    label: 'Planung & Forecasting',
    description: 'Bessere Entscheidungen treffen – auf Datenbasis',
    icon: <BarChart size={16} color="black" />,
    items: [
      {
        text: 'Personalplanung auf Auftragslage abgestimmt',
        icon: <User size={16} color="black" />,
      },
      {
        text: 'Verkaufsprognosen (z. B. Brotverkauf pro Tag)',
        icon: <Briefcase size={16} color="black" />,
      },
      {
        text: 'Automatische Beregnungssteuerung (Landwirtschaft)',
        icon: <Leaf size={16} color="black" />,
      },
      {
        text: 'Cashflowberechnung & Liquiditätsvorschau',
        icon: <BadgeEuro size={16} color="black" />,
      },
    ],
  },
  {
    label: 'KI-Agenten & Automatisierung',
    description: 'Repetitive Aufgaben auslagern, Prozesse verschlanken',
    icon: <Bot size={16} color="black" />,
    items: [
      {
        text: 'Automatische Meldungen (Zoll, Agentur der Einnahmen)',
        icon: <Bell size={16} color="black" />,
      },
      {
        text: 'Workflow-Automatisierung (z. B. E-Mail-Zusammenfassungen)',
        icon: <FolderLock size={16} color="black" />,
      },
      {
        text: 'Anomalien & Fehlererkennung (z. B. bei PV-Anlagen)',
        icon: <TriangleAlert size={16} color="black" />,
      },
      {
        text: 'Marketingunterstützung (z. B. Content-Generierung)',
        icon: <PencilRuler size={16} color="black" />,
      },
    ],
  },
  {
    label: 'Chatbot & Assistenzsysteme',
    description: 'Mitarbeiter entlasten, internes Wissen nutzbar machen',
    icon: <MessageCircle size={16} color="black" />,
    items: [
      {
        text: 'Verarbeitung von Fehlermeldungen im Kundenservice',
        icon: <FileWarning size={16} color="black" />,
      },
      {
        text: 'Abfrage interner Informationen (z. B. „Was war das letzte Angebot für Kunde X?“)',
        icon: <Search size={16} color="black" />,
      },
      {
        text: 'KI-Assistent für internes Wissensmanagement (z. B. Anleitungen, Vorschriften)',
        icon: <Brain size={16} color="black" />,
      },
    ],
  },
  {
    label: 'Controlling & Finanzen',
    description: 'Schneller zu besseren Angeboten, weniger manuelle Arbeit',
    icon: <Euro size={16} color="black" />,
    items: [
      {
        text: 'Cashflow-Analysen',
        icon: <Calculator size={16} color="black" />,
      },
      {
        text: 'Nachkalkulation von Projekten & Produkten',
        icon: <Layers size={16} color="black" />,
      },
    ],
  },
];

const Modules: FC = () => {
  const [selected, setSelected] = useState(0);
  const selectedModule = modules[selected];

  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 inline-block items-center text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
          <span>Flexible Bausteine für reale Herausforderungen</span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-2">Module & Anwendungsfälle</h2>
        <p className="text-gray-600 mb-12 max-w-2xl">
          Unsere KI-Module lassen sich flexibel kombinieren – passgenau für Ihre Geschäftsprozesse.
        </p>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left: Tab Menu */}
          <div className="space-y-3">
            {modules.map((mod, i) => (
              <div
                className={`flex flex-row gap-3 items-center w-full text-left p-5 transition ${
                  selected === i
                    ? 'bg-gray-100 border-l boder-0 border-black shadow-sm font-semibold text-black'
                    : 'border-transparent hover:bg-gray-50 text-gray-700'
                }`}
                key={i}
                onClick={() => setSelected(i)}
              >
                {mod.icon}
                {mod.label}
              </div>
            ))}
          </div>

          {/* Right: Content */}
          <div className="md:col-span-2 bg-gray-50 rounded-2xl p-6 md:p-8">
            <h3 className="text-gray-700 font-medium mb-6">{selectedModule?.description || 'Details folgen bald.'}</h3>
            <div className="space-y-3">
              {selectedModule.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
                >
                  <div className="mr-3">{item.icon}</div>
                  <span className="text-sm text-gray-800">{item.text}</span>
                </div>
              )) || <div className="text-sm text-gray-500">Noch keine Inhalte für dieses Modul.</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Modules;
