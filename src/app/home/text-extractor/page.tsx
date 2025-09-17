'use client';

import { useState } from 'react';
import { Clipboard, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Input } from '@/components/sellemond-bakery/ui/input';
import { Textarea } from '@/components/sellemond-bakery/ui/textarea';

/* -------------------- Utils -------------------- */

const stripCodeFences = (s: string) =>
  s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const safePretty = (val: any) => {
  try {
    if (typeof val === 'string') return JSON.stringify(JSON.parse(stripCodeFences(val)), null, 2);
    return JSON.stringify(val, null, 2);
  } catch {
    return typeof val === 'string' ? val : String(val);
  }
};

const tryParse = (val: any): any | null => {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(stripCodeFences(val));
    } catch {
      return null;
    }
  }
  return null;
};

const isStr = (x: any): x is string => typeof x === 'string';
const indent = (s: string, n = 2) =>
  s
    .split('\n')
    .map((l) => ' '.repeat(n) + l)
    .join('\n');

/* -------------------- Normalización flexible -------------------- */

type Contacts = {
  methodNotes: Array<{ method?: string; notes?: string }>;
  methodsList: string[];
  fieldsImplied: string[];
};

type Normalized = {
  summary?: string;
  threeUniquePoints?: string[];
  probableCustomerDemographic?: string;
  contacts: Contacts;
  extras: Record<string, any>;
};

const normalizeShape = (raw: any): Normalized | null => {
  if (!raw || typeof raw !== 'object') return null;

  const summary = isStr(raw.summary) ? raw.summary : undefined;

  const threeUniquePoints = Array.isArray(raw.threeUniquePoints) ? raw.threeUniquePoints.filter(isStr) : undefined;

  const probableCustomerDemographic = isStr(raw.probableCustomerDemographic)
    ? raw.probableCustomerDemographic
    : undefined;

  // Soporta contactInformationIfAny y contactInforationIfAny (typo), y variantes simples
  const contactBlob =
    raw.contactInformationIfAny ?? raw.contactInforationIfAny ?? raw.contactInfo ?? raw.contact ?? null;

  const contacts: Contacts = { methodNotes: [], methodsList: [], fieldsImplied: [] };

  if (Array.isArray(contactBlob)) {
    for (const entry of contactBlob) {
      if (!entry || typeof entry !== 'object') continue;
      if (isStr(entry.method) || isStr(entry.notes)) {
        contacts.methodNotes.push({
          method: isStr(entry.method) ? entry.method : undefined,
          notes: isStr(entry.notes) ? entry.notes : undefined,
        });
      }
      if (Array.isArray(entry.contactMethods)) {
        contacts.methodsList.push(...entry.contactMethods.filter(isStr));
      }
      if (Array.isArray(entry.fieldsImplied)) {
        contacts.fieldsImplied.push(...entry.fieldsImplied.filter(isStr));
      }
    }
  }

  const recognized = new Set([
    'summary',
    'threeUniquePoints',
    'probableCustomerDemographic',
    'contactInformationIfAny',
    'contactInforationIfAny',
    'contactInfo',
    'contact',
  ]);

  const extrasEntries = Object.entries(raw).filter(([k]) => !recognized.has(k));
  const extras = Object.fromEntries(extrasEntries);

  const hasContent =
    summary ||
    (threeUniquePoints && threeUniquePoints.length) ||
    probableCustomerDemographic ||
    contacts.methodNotes.length ||
    contacts.methodsList.length ||
    contacts.fieldsImplied.length ||
    Object.keys(extras).length;

  return hasContent ? { summary, threeUniquePoints, probableCustomerDemographic, contacts, extras } : null;
};

/* -------------------- Formateo a TEXTO PLANO -------------------- */

const formatPlain = (url: string, norm: Normalized | null, originalObj?: any) => {
  const lines: string[] = [];
  lines.push(`Extracted from ${url}`, '');

  if (!norm) {
    // Si no reconocemos estructura, mostramos el objeto original “bonito” o string tal cual
    lines.push(typeof originalObj === 'string' ? originalObj : safePretty(originalObj));
    return lines.join('\n');
  }

  if (norm.summary) {
    lines.push('Summary:', norm.summary, '');
  }

  if (norm.threeUniquePoints?.length) {
    lines.push('Three key points:');
    for (const pt of norm.threeUniquePoints) lines.push(`- ${pt}`);
    lines.push('');
  }

  if (norm.probableCustomerDemographic) {
    lines.push('Probable customer demographic:');
    lines.push(`- ${norm.probableCustomerDemographic}`, '');
  }

  const c = norm.contacts;
  if (c.methodsList.length || c.methodNotes.length || c.fieldsImplied.length) {
    lines.push('Contact:');
    if (c.methodsList.length) {
      lines.push('  Methods:');
      for (const m of c.methodsList) lines.push(`  - ${m}`);
    }
    if (c.methodNotes.length) {
      lines.push('  Details:');
      for (const d of c.methodNotes) {
        if (d.method) lines.push(`  - Method: ${d.method}`);
        if (d.notes) lines.push(`    Notes: ${d.notes}`);
      }
    }
    if (c.fieldsImplied.length) {
      lines.push('  Fields implied:');
      for (const f of c.fieldsImplied) lines.push(`  - ${f}`);
    }
    lines.push('');
  }

  if (Object.keys(norm.extras).length) {
    lines.push('Other fields:');
    lines.push(indent(safePretty(norm.extras)));
    lines.push('');
  }

  return lines.join('\n');
};

/* -------------------- Componente principal -------------------- */

export default function TextExtractor() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [query, setQuery] = useState('');
  const [formatted, setFormatted] = useState(''); // SOLO TEXTO PLANO
  const [isLoading, setIsLoading] = useState(false);

  const getMessageContent = (message: any) => {
    if (!message) return '';
    const c = message.content;
    if (Array.isArray(c)) {
      const jsonPart = c.find((p) => p?.type === 'output_json' || p?.type === 'json_object');
      if (jsonPart?.json) return jsonPart.json;
      const textPart = c.find((p) => p?.type === 'output_text' || p?.type === 'text');
      if (textPart?.text) return textPart.text;
      return c.map((p) => p?.text ?? p).join('\n\n');
    }
    return c;
  };

  const handleExtractText = async () => {
    if (!websiteUrl.trim()) return;
    setIsLoading(true);
    setFormatted('');

    try {
      const res = await fetch('/api/extract-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, query }),
      });

      const resParsed = await res.json();
      if (!res.ok) {
        const detail = resParsed?.detail ? `\n\n${resParsed.detail}` : '';
        throw new Error(resParsed?.error || 'Extraction failed' + detail);
      }

      const payload = resParsed?.data?.[0];
      const message = payload?.message;

      // 1) contenido base
      const answer = getMessageContent(message);

      // 2) con query a veces viene en .content; sin query es el objeto completo
      let display: any = answer;
      if (query && answer && typeof answer === 'object' && 'content' in (answer as any)) {
        display = (answer as any).content;
      }

      // 3) Intento parsear a objeto y normalizar
      const obj = typeof display === 'object' ? display : tryParse(display);
      const norm = obj ? normalizeShape(obj) : null;

      // 4) Construyo TEXTO PLANO
      const plain = formatPlain(websiteUrl, norm, obj ?? display);
      setFormatted(plain);
    } catch (err: any) {
      const msg = `Failed to extract: ${err?.message || 'Unknown error'}`;
      setFormatted(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resultIsError = formatted.startsWith('Failed');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {}
  };

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-bold text-black">Extract Website Information</h1>
            <p className="text-gray-700">AI Scrapper Agent</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INPUT */}
          <Card className="shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Provide Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 h-[520px]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What information are you looking for?
                </label>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe what specific information you want to extract..."
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 min-h-[250px]"
                />
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleExtractText}
                  disabled={!websiteUrl.trim() || isLoading}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 px-8 py-2 rounded-xl shadow"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    'Extract Text'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULT: SOLO TEXTO PLANO */}
          <Card className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-gray-900">Extraction Result</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  disabled={!formatted}
                  className="gap-2"
                  title="Copiar"
                >
                  <Clipboard className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </CardHeader>

            <CardContent className="h-[520px]">
              {!formatted ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No extracted text yet. Enter details and click extract.</p>
                  </div>
                </div>
              ) : (
                <div
                  className={`h-full rounded-lg border transition-all duration-300 ${
                    resultIsError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <pre
                    className={`font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words p-4 pr-6 max-h-[468px] overflow-y-auto ${
                      resultIsError ? 'text-red-700' : 'text-gray-700'
                    }`}
                  >
                    {formatted}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
