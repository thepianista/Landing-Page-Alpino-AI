'use client';

import { useEffect, useMemo, useState } from 'react';

function detectDelimiter(sample: string): ',' | ';' {
  // Mira las primeras líneas ignorando comas dentro de comillas
  let commas = 0, semicolons = 0;
  let inQuotes = false;
  const maxChars = Math.min(sample.length, 2000); // no necesitamos revisar todo
  for (let i = 0; i < maxChars; i++) {
    const ch = sample[i];
    if (ch === '"') {
      // dobles comillas escapadas "" dentro de quotes
      if (inQuotes && sample[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (ch === ',') commas++;
      else if (ch === ';') semicolons++;
      else if (ch === '\n') break; // una línea suele bastar
    }
  }
  return commas >= semicolons ? ',' : ';';
}

// Parser CSV sin librerías: maneja comillas, comas/; y saltos de línea en celdas
function parseCSV(raw: string): string[][] {
  if (!raw) return [];
  // Quita BOM si viene
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';

  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      // "" => comilla escapada
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++; // saltar la segunda comilla
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes) {
      if (ch === delim) {
        row.push(cell);
        cell = '';
        continue;
      }
      if (ch === '\r' || ch === '\n') {
        row.push(cell);
        cell = '';
        // manejar CRLF
        if (ch === '\r' && text[i + 1] === '\n') i++;
        // evita agregar filas completamente vacías (skipEmptyLines: 'greedy')
        const allEmpty = row.every((c) => c === '');
        if (!allEmpty || rows.length === 0) rows.push(row);
        row = [];
        continue;
      }
    }

    // carácter normal
    cell += ch;
  }

  // último valor si el archivo no termina en salto de línea
  row.push(cell);
  const allEmpty = row.every((c) => c === '');
  if (!allEmpty || rows.length === 0) rows.push(row);

  return rows;
}

type Props = {
  sheetId: string;
  gid: string | number;
};

export default function ExcelPreviewSheet({ sheetId, gid }: Props) {
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        const parsed = parseCSV(text);
        // filtra filas vacías de más
        const cleaned = parsed.filter((r) => r.length && r.some((c) => c !== ''));
        setRows(cleaned);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sheetId, gid]);

  // Normaliza: todas las filas con el mismo # de columnas
  const normalized = useMemo(() => {
    if (!rows.length) return rows;
    const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    return rows.map((r) =>
      r.length === maxCols ? r : [...r, ...Array(maxCols - r.length).fill('')]
    );
  }, [rows]);

  if (loading) return <p className="text-sm text-gray-500">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error}</p>;
  if (!normalized.length) return <p className="text-sm text-gray-500">Sin datos</p>;

  const [header, ...body] = normalized;

  return (
    <div className="w-full h-52 overflow-auto rounded-xl border">
      <table className="min-w-max w-full text-sm table-auto">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-gray-800 border-b whitespace-nowrap"
                title={h}
              >
                <div className="truncate">{h}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="odd:bg-white even:bg-gray-50">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 border-b align-top whitespace-pre-wrap"
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
