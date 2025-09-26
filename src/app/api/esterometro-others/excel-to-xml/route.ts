import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { excelToXmlFromSingleXlsx } from '@/lib/excel-to-xml-comprehensive';

export const runtime = 'nodejs';

async function downloadSheetXlsx(sheetId: string, gid: string): Promise<ArrayBuffer> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar sheet ${sheetId} (gid ${gid}) [HTTP ${res.status}]`);
  return await res.arrayBuffer();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get('sheetId') ?? '';
    const gid = searchParams.get('gid') ?? '';
    if (!sheetId || !gid) {
      return NextResponse.json({ error: 'Faltan parámetros: sheetId y gid' }, { status: 400 });
    }

    const populatedBuf = await downloadSheetXlsx(sheetId, gid);
    const outputs = await excelToXmlFromSingleXlsx(populatedBuf, { mode: 'xsd', includeXmlDecl: true });

    if (!outputs.length) {
      return NextResponse.json({ error: 'No se generó ningún XML desde esa hoja' }, { status: 422 });
    }

    if (outputs.length === 1) {
      const { filename, xml } = outputs[0];
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const zip = new JSZip();
    outputs.forEach(({ filename, xml }) => zip.file(filename, xml));
    const zipAb = await zip.generateAsync({ type: 'arraybuffer' });
    return new NextResponse(zipAb, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="esterometro_xml.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? 'Error interno' }, { status: 500 });
  }
}
