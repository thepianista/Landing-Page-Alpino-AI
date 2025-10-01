import { NextRequest, NextResponse } from 'next/server';
import { processXmlToExcel, generateSingleXmlExcel } from '@/lib/xml-to-excel-processor';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    // Check if it's an XML file
    if (!file.name.toLowerCase().endsWith('.xml')) {
      return NextResponse.json({ error: 'Solo se permiten archivos XML' }, { status: 400 });
    }

    // Read the XML content
    const xmlContent = await file.text();

    // Try to find the mapping Excel file
    // The file is located in src/app/data/
    const mappingExcelPath = path.join(process.cwd(), 'src', 'app', 'data', 'hierarchical_mapping_fixed.xlsx');
    
    console.log('Current working directory:', process.cwd());
    console.log('Looking for mapping file at:', mappingExcelPath);
    console.log('File exists:', fs.existsSync(mappingExcelPath));
    
    let mappingExcel: Buffer;
    try {
      mappingExcel = fs.readFileSync(mappingExcelPath);
      console.log('Successfully loaded mapping Excel file, size:', mappingExcel.length, 'bytes');
    } catch (error) {
      console.error('Mapping Excel file not found:', mappingExcelPath);
      console.error('Error details:', error);
      return NextResponse.json({ 
        error: 'Archivo de mapeo Excel no encontrado. Asegúrate de que hierarchical_mapping_fixed.xlsx esté en src/app/data/' 
      }, { status: 500 });
    }

    // TEMPORARY: Debug XML parsing first
    console.log('=== TEMPORARY DEBUG MODE ===');
    console.log('XML Content length:', xmlContent.length);
    console.log('First 500 chars:', xmlContent.substring(0, 500));

    // Parse XML to see structure
    const { parseStringPromise } = await import('xml2js');
    const root = await parseStringPromise(xmlContent, { 
      explicitArray: false, 
      mergeAttrs: true, 
      ignoreAttrs: false, 
      charkey: '_' 
    });
    
    console.log('Root structure:', Object.keys(root));
    console.log('FatturaElettronica keys:', root.FatturaElettronica ? Object.keys(root.FatturaElettronica) : 'Not found');
    
    if (root.FatturaElettronica?.FatturaElettronicaHeader) {
      console.log('Header keys:', Object.keys(root.FatturaElettronica.FatturaElettronicaHeader));
      
      if (root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione) {
        console.log('DatiTrasmissione keys:', Object.keys(root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione));
        
        if (root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione.IdTrasmittente) {
          console.log('IdTrasmittente keys:', Object.keys(root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione.IdTrasmittente));
          console.log('IdPaese value:', root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione.IdTrasmittente.IdPaese);
          console.log('IdCodice value:', root.FatturaElettronica.FatturaElettronicaHeader.DatiTrasmissione.IdTrasmittente.IdCodice);
        }
      }
    }

    // TEMPORARY: Test direct extraction without mapping
    console.log('\n=== TESTING DIRECT EXTRACTION ===');
    const directExtraction = {
      IdPaese: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente?.IdPaese?._ || 
               root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente?.IdPaese,
      IdCodice: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente?.IdCodice?._ || 
                root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.IdTrasmittente?.IdCodice,
      ProgressivoInvio: root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.ProgressivoInvio?._ || 
                       root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.ProgressivoInvio,
      Denominazione: root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.Anagrafica?.Denominazione?._ || 
                    root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.Anagrafica?.Denominazione,
      TipoDocumento: root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.TipoDocumento?._ || 
                    root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.TipoDocumento,
      ImportoTotaleDocumento: root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.ImportoTotaleDocumento?._ || 
                             root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.ImportoTotaleDocumento
    };
    
    console.log('Direct extraction results:', directExtraction);

    // Process the XML file
    const result = await processXmlToExcel(xmlContent, mappingExcel);

    if (!result.success) {
      return NextResponse.json({ 
        error: `Error procesando XML: ${result.error}` 
      }, { status: 500 });
    }

    console.log('XML processed successfully, generating Excel file...');
    console.log('Result rowValues:', result.rowValues);

    // Create Excel with extracted data using direct extraction
    console.log('\n=== CREATING EXCEL WITH EXTRACTED DATA ===');
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('XML Data');
    
    // Add headers
    worksheet.addRow(['Field', 'Value', 'Source']);
    
    // Add all extracted data
    worksheet.addRow(['IdPaese', directExtraction.IdPaese || '', 'DatiTrasmissione > IdTrasmittente']);
    worksheet.addRow(['IdCodice', directExtraction.IdCodice || '', 'DatiTrasmissione > IdTrasmittente']);
    worksheet.addRow(['ProgressivoInvio', directExtraction.ProgressivoInvio || '', 'DatiTrasmissione']);
    worksheet.addRow(['FormatoTrasmissione', root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.FormatoTrasmissione?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.FormatoTrasmissione || '', 'DatiTrasmissione']);
    worksheet.addRow(['CodiceDestinatario', root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.CodiceDestinatario?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.DatiTrasmissione?.CodiceDestinatario || '', 'DatiTrasmissione']);
    
    // CedentePrestatore data
    worksheet.addRow(['Cedente_IdPaese', root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.IdFiscaleIVA?.IdPaese?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.IdFiscaleIVA?.IdPaese || '', 'CedentePrestatore > IdFiscaleIVA']);
    worksheet.addRow(['Cedente_IdCodice', root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice || '', 'CedentePrestatore > IdFiscaleIVA']);
    worksheet.addRow(['Denominazione', directExtraction.Denominazione || '', 'CedentePrestatore > Anagrafica']);
    worksheet.addRow(['RegimeFiscale', root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.RegimeFiscale?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CedentePrestatore?.DatiAnagrafici?.RegimeFiscale || '', 'CedentePrestatore > DatiAnagrafici']);
    
    // CessionarioCommittente data
    worksheet.addRow(['Cessionario_IdPaese', root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.IdFiscaleIVA?.IdPaese?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.IdFiscaleIVA?.IdPaese || '', 'CessionarioCommittente > IdFiscaleIVA']);
    worksheet.addRow(['Cessionario_IdCodice', root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice || '', 'CessionarioCommittente > IdFiscaleIVA']);
    worksheet.addRow(['Cessionario_Denominazione', root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.Anagrafica?.Denominazione?._ || 
                     root.FatturaElettronica?.FatturaElettronicaHeader?.CessionarioCommittente?.DatiAnagrafici?.Anagrafica?.Denominazione || '', 'CessionarioCommittente > Anagrafica']);
    
    // Document data
    worksheet.addRow(['TipoDocumento', directExtraction.TipoDocumento || '', 'DatiGeneraliDocumento']);
    worksheet.addRow(['Divisa', root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Divisa?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Divisa || '', 'DatiGeneraliDocumento']);
    worksheet.addRow(['Data', root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Data?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Data || '', 'DatiGeneraliDocumento']);
    worksheet.addRow(['Numero', root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Numero?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento?.Numero || '', 'DatiGeneraliDocumento']);
    worksheet.addRow(['ImportoTotaleDocumento', directExtraction.ImportoTotaleDocumento || '', 'DatiGeneraliDocumento']);
    
    // Line items data
    worksheet.addRow(['NumeroLinea', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.NumeroLinea?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.NumeroLinea || '', 'DettaglioLinee']);
    worksheet.addRow(['Descrizione', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.Descrizione?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.Descrizione || '', 'DettaglioLinee']);
    worksheet.addRow(['Quantita', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.Quantita?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.Quantita || '', 'DettaglioLinee']);
    worksheet.addRow(['PrezzoUnitario', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.PrezzoUnitario?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.PrezzoUnitario || '', 'DettaglioLinee']);
    worksheet.addRow(['PrezzoTotale', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.PrezzoTotale?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.PrezzoTotale || '', 'DettaglioLinee']);
    worksheet.addRow(['AliquotaIVA', root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.AliquotaIVA?._ || 
                     root.FatturaElettronica?.FatturaElettronicaBody?.DatiBeniServizi?.DettaglioLinee?.AliquotaIVA || '', 'DettaglioLinee']);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 20);
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Excel with extracted data generated, size:', Buffer.from(buffer).length, 'bytes');

    // Create filename for download
    const baseName = file.name.replace(/\.xml$/i, '');
    const excelFilename = `${baseName}_extracted_data.xlsx`;

    // Return Excel file as download
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${excelFilename}"`,
        'Content-Length': Buffer.from(buffer).length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error en accounting-xml:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
