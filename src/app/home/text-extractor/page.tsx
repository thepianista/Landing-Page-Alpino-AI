'use client';

import { useState } from 'react';
import { Mountain, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Input } from '@/components/sellemond-bakery/ui/input';
import { Textarea } from '@/components/sellemond-bakery/ui/textarea';

export default function TextExtractor() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExtractText = async () => {
    if (!websiteUrl.trim()) return;

    setIsLoading(true);
    setResult('');

    try {
      const res = await fetch('/api/extract-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, query }),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail ? `\n\n${data.detail}` : '';
        throw new Error(data?.error || 'Extraction failed' + detail);
      }

      const payload = data?.data || {};
      const textOut =
        payload.text || payload.answer || payload.result || payload.content || JSON.stringify(payload, null, 2);

      setResult(`Extracted from ${websiteUrl}\n\n${textOut}`);
    } catch (err: any) {
      setResult(`Failed to extract: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resultIsError = result.startsWith('Failed');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-black">Extract Website Information</h1>
              <p className="text-gray-700">AI-powered text extraction tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INPUT SECTION */}
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

              <div className="text-center">
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

          {/* RESULT SECTION */}
          <Card className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Extraction Result</CardTitle>
            </CardHeader>
            <CardContent className="h-[520px]">
              {result ? (
                <div
                  className={`h-full rounded-lg border transition-all duration-300 p-0 ${
                    resultIsError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* caja scrollable */}
                  <pre
                    className={`font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words p-4 pr-6 max-h-[468px] overflow-y-auto
                      ${resultIsError ? 'text-red-700' : 'text-gray-700'}`}
                  >
                    {result}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No extracted text yet. Enter details and click extract.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
