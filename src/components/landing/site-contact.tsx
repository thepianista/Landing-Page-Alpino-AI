'use client';

import { FC } from 'react';

const Contact: FC = () => {
  return (
    <section className="bg-gray-50 py-24 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl p-8 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-12 items-start shadow-sm">
        <div>
          <span className="text-xs text-gray-500 bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm">
            Noch Fragen?
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-4 leading-snug mt-7">
            Lassen Sie uns <br /> gemeinsam starten
          </h2>
          <p className="text-gray-600 text-sm">
            Wir freuen uns auf Ihre Anfrage. Schreiben Sie uns einfach über das Formular oder direkt per E-Mail.
          </p>
        </div>

        <form className="space-y-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1 text-gray-700">Name</label>
              <input
                type="text"
                placeholder="Ihr vollständiger Name"
                className="text-black w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
              />
            </div>
            <div>
              <label className="text-sm block mb-1 text-gray-700">E-Mail-Adresse</label>
              <input
                type="email"
                placeholder="Ihre geschäftliche E-Mail-Adresse"
                className="text-black w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
              />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1 text-gray-700">Unternehmen</label>
            <input
              type="text"
              placeholder="Firmenname"
              className="text-black w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
            />
          </div>

          <div>
            <label className="text-sm block mb-1 text-gray-700">Nachricht</label>
            <textarea
              placeholder="Schreiben Sie uns Ihre Anfrage..."
              rows={4}
              className="text-black w-full border border-gray-300 rounded-md px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-900"
            />
          </div>

          <div>
            <button
              type="submit"
              className="bg-green-900 text-white px-6 py-3 rounded-xl shadow hover:bg-green-800 transition text-sm"
            >
              Nachricht senden →
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Contact;
