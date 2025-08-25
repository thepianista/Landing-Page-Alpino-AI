'use client';

import { FC } from 'react';
import { HiCheckCircle } from 'react-icons/hi';

const items = [
  {
    title: 'Kosten reduzieren',
    description: 'Weniger Fehler, schlankere Abläufe.',
  },
  {
    title: 'Umsatz steigern',
    description: 'Schneller arbeiten, besser entscheiden.',
  },
  {
    title: 'Mitarbeiter entlasten',
    description: 'Repetitives auslagern, Fokus gewinnen.',
  },
  {
    title: 'Fokus aufs Kerngeschäft',
    description: 'Weniger Bürokratie, mehr Wirkung.',
  },
];

const Focus: FC = () => {
  return (
    <section className="bg-gray-50 py-20 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl px-8 md:px-16 py-14">
        <div className="mb-5">
          <span className="inline-block text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
            Wie viel Ihrer Arbeitszeit fließt in Aufgaben, die wirklich Wert schaffen?
          </span>
        </div>

        <div className="flex flex-col gap-10 items-start">
          <div className="flex flex-row justify-between gap-10">
            <h2 className="text-3xl md:text-4xl text-green-900 font-semibold mb-10 w-3/4">
              Warum jetzt KI? – Ihre <br /> Ziele im Fokus
            </h2>

            <div className="text-gray-600 text-md leading-relaxed pt-1 w-2/4">
              Viele Unternehmen verschwenden täglich Zeit mit wiederkehrenden Aufgaben. Mit KI können Sie sich auf das
              Wesentliche konzentrieren.
            </div>
          </div>

          <div className="flex flex-row gap-8">
            {items.map((item, index) => (
              <div key={index}>
                <div className="flex flex-col items-start gap-2 mb-1">
                  <HiCheckCircle className="text-black text-lg" />
                  <span className="font-semibold text-md text-black">{item.title}</span>
                </div>
                <p className="text-gray-600 text-md">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Focus;
