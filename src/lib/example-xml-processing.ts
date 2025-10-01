/**
 * Ejemplo de uso del procesador XML to Excel
 * 
 * Este archivo demuestra cómo usar las funciones del procesador XML
 * para extraer datos de facturas electrónicas italianas.
 */

import { processXmlToExcel, batchProcessXmlFiles } from './xml-to-excel-processor';
import { XmlFile } from '@/types';
import fs from 'fs';
import path from 'path';

// Ejemplo de XML de factura electrónica italiana
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<FatturaElettronica xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>01234567890</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>01234567890</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>ACME SRL</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Roma 123</Indirizzo>
        <NumeroCivico>123</NumeroCivico>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>09876543210</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>CLIENTE SPA</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Milano 456</Indirizzo>
        <NumeroCivico>456</NumeroCivico>
        <CAP>20100</CAP>
        <Comune>Milano</Comune>
        <Provincia>MI</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2024-01-15</Data>
        <Numero>FAT-2024-001</Numero>
        <ImportoTotaleDocumento>1000.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Servizi di consulenza</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>1000.00</PrezzoUnitario>
        <PrezzoTotale>1000.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>1000.00</ImponibileImporto>
        <Imposta>220.00</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</FatturaElettronica>`;

/**
 * Ejemplo de procesamiento individual
 */
export async function exampleIndividualProcessing() {
  console.log('=== Ejemplo de Procesamiento Individual ===');
  
  try {
    // Cargar el archivo de mapeo Excel
    const mappingExcelPath = path.join(process.cwd(), 'src', 'app', 'data', 'hierarchical_mapping_fixed.xlsx');
    const mappingExcel = fs.readFileSync(mappingExcelPath);
    
    // Procesar el XML
    const result = await processXmlToExcel(sampleXml, mappingExcel);
    
    if (result.success) {
      console.log('✅ Procesamiento exitoso');
      console.log(`📊 Valores extraídos: ${result.rowValues.length}`);
      console.log('📋 Primeros 10 valores:', result.rowValues.slice(0, 10));
      
      // Mostrar valores no vacíos
      const nonEmptyValues = result.rowValues.filter(value => value && value.trim());
      console.log(`📈 Valores con contenido: ${nonEmptyValues.length}`);
      console.log('📝 Valores con contenido:', nonEmptyValues);
    } else {
      console.error('❌ Error en el procesamiento:', result.error);
    }
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

/**
 * Ejemplo de procesamiento por lotes
 */
export async function exampleBatchProcessing() {
  console.log('\n=== Ejemplo de Procesamiento por Lotes ===');
  
  try {
    // Crear múltiples archivos XML de ejemplo
    const xmlFiles: XmlFile[] = [
      { name: 'invoice1.xml', content: sampleXml },
      { name: 'invoice2.xml', content: sampleXml.replace('FAT-2024-001', 'FAT-2024-002') },
      { name: 'invoice3.xml', content: sampleXml.replace('FAT-2024-001', 'FAT-2024-003') }
    ];
    
    // Cargar el archivo de mapeo Excel
    const mappingExcelPath = path.join(process.cwd(), 'src', 'app', 'data', 'hierarchical_mapping_fixed.xlsx');
    const mappingExcel = fs.readFileSync(mappingExcelPath);
    
    // Procesar todos los archivos
    const results = await batchProcessXmlFiles(xmlFiles, mappingExcel);
    
    console.log(`📁 Archivos procesados: ${Object.keys(results).length}`);
    
    for (const [filename, result] of Object.entries(results)) {
      if (result.success) {
        const nonEmptyValues = result.rowValues.filter(value => value && value.trim());
        console.log(`✅ ${filename}: ${nonEmptyValues.length} valores extraídos`);
      } else {
        console.error(`❌ ${filename}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('❌ Error en procesamiento por lotes:', error);
  }
}

/**
 * Ejemplo de uso con archivos reales
 */
export async function exampleWithRealFiles() {
  console.log('\n=== Ejemplo con Archivos Reales ===');
  
  try {
    const xmlDir = path.join(process.cwd(), 'src', 'app', 'data', 'XML');
    const mappingExcelPath = path.join(process.cwd(), 'src', 'app', 'data', 'hierarchical_mapping_fixed.xlsx');
    
    // Verificar que existan los directorios/archivos
    if (!fs.existsSync(xmlDir)) {
      console.log('📁 Directorio XML no encontrado:', xmlDir);
      console.log('💡 Crea el directorio y agrega archivos XML para probar');
      return;
    }
    
    if (!fs.existsSync(mappingExcelPath)) {
      console.log('📊 Archivo de mapeo no encontrado:', mappingExcelPath);
      console.log('💡 Asegúrate de tener hierarchical_mapping_fixed.xlsx en data/');
      return;
    }
    
    // Leer archivos XML del directorio
    const xmlFiles = fs.readdirSync(xmlDir)
      .filter(file => file.toLowerCase().endsWith('.xml'))
      .map(file => ({
        name: file,
        content: fs.readFileSync(path.join(xmlDir, file), 'utf-8')
      }));
    
    if (xmlFiles.length === 0) {
      console.log('📁 No se encontraron archivos XML en:', xmlDir);
      return;
    }
    
    console.log(`📁 Encontrados ${xmlFiles.length} archivos XML`);
    
    // Cargar el archivo de mapeo
    const mappingExcel = fs.readFileSync(mappingExcelPath);
    
    // Procesar archivos
    const results = await batchProcessXmlFiles(xmlFiles, mappingExcel);
    
    // Mostrar resultados
    let successCount = 0;
    let errorCount = 0;
    
    for (const [filename, result] of Object.entries(results)) {
      if (result.success) {
        successCount++;
        const nonEmptyValues = result.rowValues.filter(value => value && value.trim());
        console.log(`✅ ${filename}: ${nonEmptyValues.length} valores extraídos`);
      } else {
        errorCount++;
        console.error(`❌ ${filename}: ${result.error}`);
      }
    }
    
    console.log(`\n📊 Resumen: ${successCount} exitosos, ${errorCount} errores`);
  } catch (error) {
    console.error('❌ Error con archivos reales:', error);
  }
}

/**
 * Función principal para ejecutar todos los ejemplos
 */
export async function runAllExamples() {
  console.log('🚀 Iniciando ejemplos del procesador XML to Excel\n');
  
  await exampleIndividualProcessing();
  await exampleBatchProcessing();
  await exampleWithRealFiles();
  
  console.log('\n✨ Ejemplos completados');
}

// Ejecutar ejemplos si se llama directamente
if (require.main === module) {
  runAllExamples().catch(console.error);
}
