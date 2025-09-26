import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { excelToXml } from '@/lib/excel-to-xml-comprehensive';

export const runtime = 'nodejs';

/**
 * Comprehensive Excel to XML converter API endpoint
 *
 * This endpoint provides the full functionality of the Python excel-to-xml.py script
 * converted to TypeScript. It can handle:
 * - Single Excel files with embedded mapping and representation data
 * - Multiple files (populated Excel + mapping + representation)
 * - Both XSD and Portal modes
 * - Proper XML namespace handling
 * - JSON array processing for repeated elements
 */

async function downloadSheetXlsx(sheetId: string, gid: string): Promise<ArrayBuffer> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo descargar sheet ${sheetId} (gid ${gid}) [HTTP ${res.status}]`);
  return await res.arrayBuffer();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get('sheetId') ?? '';
    const gid = searchParams.get('gid') ?? '';

    if (!sheetId || !gid) {
      return NextResponse.json(
        {
          error: 'Faltan parámetros: sheetId y gid son requeridos',
        },
        { status: 400 }
      );
    }

    // Configuration options
    const modeParam = (searchParams.get('mode') ?? 'xsd').toLowerCase();
    const mode = modeParam === 'portal' ? 'portal' : 'xsd';
    const includeXmlDecl = (searchParams.get('decl') ?? '1') === '1';

    // Download the Excel file
    const xlsx = await downloadSheetXlsx(sheetId, gid);

    // Convert to XML using the comprehensive implementation
    const outputs = await excelToXml(xlsx, { mode, includeXmlDecl });

    if (!outputs.length) {
      return NextResponse.json(
        {
          error: 'No se generó ningún XML desde esa hoja. Verifique que la hoja contenga datos válidos.',
        },
        { status: 422 }
      );
    }

    // Return single XML file if only one invoice
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

    // Return ZIP file for multiple invoices
    const zip = new JSZip();
    outputs.forEach(({ filename, xml }) => zip.file(filename, xml));
    const zipAb = await zip.generateAsync({ type: 'arraybuffer' });

    return new NextResponse(zipAb, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="fatture_elettroniche_${mode}_${new Date()
          .toISOString()
          .slice(0, 10)}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('Error in comprehensive Excel to XML conversion:', e);
    return NextResponse.json(
      {
        error: e?.message ?? 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          error: 'No se proporcionó archivo Excel',
        },
        { status: 400 }
      );
    }

    // Configuration options from form data
    const modeParam = (formData.get('mode') as string) ?? 'xsd';
    const mode = modeParam === 'portal' ? 'portal' : 'xsd';
    const includeXmlDecl = (formData.get('includeXmlDecl') as string) !== 'false';

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();

    // Convert to XML using the comprehensive implementation
    const outputs = await excelToXml(arrayBuffer, { mode, includeXmlDecl });

    if (!outputs.length) {
      return NextResponse.json(
        {
          error: 'No se generó ningún XML desde el archivo. Verifique que el archivo contenga datos válidos.',
        },
        { status: 422 }
      );
    }

    // Return single XML file if only one invoice
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

    // Return ZIP file for multiple invoices
    const zip = new JSZip();
    outputs.forEach(({ filename, xml }) => zip.file(filename, xml));
    const zipAb = await zip.generateAsync({ type: 'arraybuffer' });

    return new NextResponse(zipAb, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="fatture_elettroniche_${mode}_${new Date()
          .toISOString()
          .slice(0, 10)}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('Error in comprehensive Excel to XML conversion:', e);
    return NextResponse.json(
      {
        error: e?.message ?? 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
