import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.xml')) {
      return NextResponse.json({ error: 'Solo se permiten archivos XML' }, { status: 400 });
    }

    const xmlContent = await file.text();
    
    console.log('=== DEBUG XML ENDPOINT ===');
    console.log('XML Content length:', xmlContent.length);
    console.log('First 500 chars:', xmlContent.substring(0, 500));

    // Parse XML with different configurations
    const configs = [
      { name: 'default', options: {} },
      { name: 'explicitArray-false', options: { explicitArray: false } },
      { name: 'mergeAttrs-true', options: { explicitArray: false, mergeAttrs: true } },
      { name: 'full-config', options: { explicitArray: false, mergeAttrs: true, ignoreAttrs: false, charkey: '_' } }
    ];

    const results: any = {};

    for (const config of configs) {
      try {
        console.log(`\n--- Testing config: ${config.name} ---`);
        const parsed = await parseStringPromise(xmlContent, config.options);
        results[config.name] = {
          success: true,
          rootKeys: Object.keys(parsed),
          structure: JSON.stringify(parsed, null, 2).substring(0, 2000) + '...'
        };
        console.log('Root keys:', Object.keys(parsed));
        console.log('Structure preview:', JSON.stringify(parsed, null, 2).substring(0, 1000));
      } catch (error) {
        results[config.name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error(`Config ${config.name} failed:`, error);
      }
    }

    // Test specific navigation
    console.log('\n--- Testing specific navigation ---');
    const root = await parseStringPromise(xmlContent, { explicitArray: false, mergeAttrs: true, ignoreAttrs: false, charkey: '_' });
    
    const navigationTests = [
      {
        name: 'Root level',
        path: [],
        data: root
      },
      {
        name: 'FatturaElettronica',
        path: ['FatturaElettronica'],
        data: root.FatturaElettronica
      },
      {
        name: 'FatturaElettronicaHeader',
        path: ['FatturaElettronica', 'FatturaElettronicaHeader'],
        data: root.FatturaElettronica?.FatturaElettronicaHeader
      },
      {
        name: 'DatiTrasmissione',
        path: ['FatturaElettronica', 'FatturaElettronicaHeader', 'DatiTrasmissione'],
        data: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione
      },
      {
        name: 'IdTrasmittente',
        path: ['FatturaElettronica', 'FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente'],
        data: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente
      },
      {
        name: 'IdPaese',
        path: ['FatturaElettronica', 'FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente', 'IdPaese'],
        data: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente?.IdPaese
      }
    ];

    const navigationResults: any = {};
    for (const test of navigationTests) {
      console.log(`\n--- ${test.name} ---`);
      console.log('Path:', test.path);
      console.log('Data type:', typeof test.data);
      console.log('Data keys:', test.data && typeof test.data === 'object' ? Object.keys(test.data) : 'N/A');
      console.log('Data value:', test.data);
      
      navigationResults[test.name] = {
        path: test.path,
        dataType: typeof test.data,
        dataKeys: test.data && typeof test.data === 'object' ? Object.keys(test.data) : null,
        dataValue: test.data,
        hasText: test.data && typeof test.data === 'object' && test.data._ !== undefined ? test.data._ : null
      };
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      xmlLength: xmlContent.length,
      parseConfigs: results,
      navigationTests: navigationResults
    });

  } catch (error: any) {
    console.error('Debug XML error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}
