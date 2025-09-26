/**
 * Example usage of the comprehensive Excel to XML converter
 *
 * This file demonstrates how to use the improved TypeScript implementation
 * that includes validation and generates XML that passes fatturacheck.it validation.
 */

import { excelToXml } from './excel-to-xml-comprehensive';

// Example of how to use the comprehensive converter
export async function exampleUsage() {
  try {
    // Example Excel buffer (you would load this from a file or API)
    const excelBuffer = new ArrayBuffer(0); // Replace with actual Excel file buffer

    // Convert with XSD mode (default)
    const results = await excelToXml(excelBuffer, {
      mode: 'xsd',
      includeXmlDecl: true,
    });

    console.log(`Generated ${results.length} XML files:`);
    results.forEach(({ filename, xml }) => {
      console.log(`\n--- ${filename} ---`);
      console.log(xml);
    });

    return results;
  } catch (error) {
    console.error('Error converting Excel to XML:', error);
    throw error;
  }
}

// Example with Portal mode
export async function examplePortalMode() {
  try {
    const excelBuffer = new ArrayBuffer(0); // Replace with actual Excel file buffer

    // Convert with Portal mode (for fatturacheck.it validation)
    const results = await excelToXml(excelBuffer, {
      mode: 'portal',
      includeXmlDecl: true,
    });

    console.log(`Generated ${results.length} XML files in Portal mode:`);
    results.forEach(({ filename, xml }) => {
      console.log(`\n--- ${filename} ---`);
      console.log(xml);
    });

    return results;
  } catch (error) {
    console.error('Error converting Excel to XML:', error);
    throw error;
  }
}

// Example validation error handling
export async function exampleWithValidation() {
  try {
    const excelBuffer = new ArrayBuffer(0); // Replace with actual Excel file buffer

    const results = await excelToXml(excelBuffer, {
      mode: 'xsd',
      includeXmlDecl: true,
    });

    return results;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Errores de validación')) {
      console.error('Validation errors found:');
      console.error(error.message);

      // You can parse the validation errors and show them to the user
      const errorLines = error.message.split('\n- ');
      errorLines.forEach((line, index) => {
        if (index > 0) {
          // Skip the first line which is the header
          console.error(`  ${index}. ${line}`);
        }
      });
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// Example of required Excel structure
export const requiredExcelStructure = {
  description: 'The Excel file must contain the following structure:',
  columns: [
    {
      id: '1.1.1.1',
      name: 'IdTrasmittente/IdPaese',
      example: 'IT',
      required: true,
      validation: 'ISO 3166-1 alpha-2 country code',
    },
    {
      id: '1.1.1.2',
      name: 'IdTrasmittente/IdCodice',
      example: '12345678901',
      required: true,
      validation: 'Alphanumeric with dots, underscores, and hyphens',
    },
    {
      id: '1.1.2',
      name: 'ProgressivoInvio',
      example: '00001',
      required: true,
      validation: 'Alphanumeric',
    },
    {
      id: '1.2.1.1.1',
      name: 'CedentePrestatore/IdFiscaleIVA/IdPaese',
      example: 'IT',
      required: true,
      validation: 'ISO 3166-1 alpha-2 country code',
    },
    {
      id: '1.2.1.1.2',
      name: 'CedentePrestatore/IdFiscaleIVA/IdCodice',
      example: '12345678901',
      required: true,
      validation: 'Alphanumeric with dots, underscores, and hyphens',
    },
    {
      id: '1.2.1.3.1',
      name: 'CedentePrestatore/Denominazione',
      example: 'ACME S.r.l.',
      required: false, // Either this or Nome+Cognome
      validation: 'Company name',
    },
    {
      id: '1.2.1.3.2',
      name: 'CedentePrestatore/Nome',
      example: 'Mario',
      required: false, // Either this+Cognome or Denominazione
      validation: 'First name',
    },
    {
      id: '1.2.1.3.3',
      name: 'CedentePrestatore/Cognome',
      example: 'Rossi',
      required: false, // Either this+Nome or Denominazione
      validation: 'Last name',
    },
    {
      id: '1.2.1.6',
      name: 'CedentePrestatore/RegimeFiscale',
      example: 'RF01',
      required: true,
      validation: 'RF01-RF19',
    },
    {
      id: '1.2.2.4',
      name: 'CedentePrestatore/Indirizzo',
      example: 'Via Roma 123',
      required: true,
      validation: 'Address',
    },
    {
      id: '1.2.2.5',
      name: 'CedentePrestatore/NumeroCivico',
      example: '123',
      required: false,
      validation: 'Street number',
    },
    {
      id: '1.2.2.6',
      name: 'CedentePrestatore/CAP',
      example: '00100',
      required: true,
      validation: '5 digits',
    },
    {
      id: '1.2.2.7',
      name: 'CedentePrestatore/Comune',
      example: 'Roma',
      required: true,
      validation: 'City name',
    },
    {
      id: '1.2.2.9',
      name: 'CedentePrestatore/Provincia',
      example: 'RM',
      required: false,
      validation: 'Province code',
    },
    {
      id: '1.2.2.10',
      name: 'CedentePrestatore/Nazione',
      example: 'IT',
      required: true,
      validation: 'ISO 3166-1 alpha-2 country code',
    },
    {
      id: '1.4.1.1.1',
      name: 'CessionarioCommittente/IdFiscaleIVA/IdPaese',
      example: 'IT',
      required: false, // Either this+IdCodice or CodiceFiscale
      validation: 'ISO 3166-1 alpha-2 country code',
    },
    {
      id: '1.4.1.1.2',
      name: 'CessionarioCommittente/IdFiscaleIVA/IdCodice',
      example: '98765432109',
      required: false, // Either this+IdPaese or CodiceFiscale
      validation: 'Alphanumeric with dots, underscores, and hyphens',
    },
    {
      id: '1.4.1.2',
      name: 'CessionarioCommittente/CodiceFiscale',
      example: 'RSSMRA80A01H501U',
      required: false, // Either this or IdFiscaleIVA
      validation: 'Italian tax code',
    },
    {
      id: '1.4.1.3.1',
      name: 'CessionarioCommittente/Denominazione',
      example: 'Client S.r.l.',
      required: false, // Either this or Nome+Cognome
      validation: 'Company name',
    },
    {
      id: '1.4.1.3.2',
      name: 'CessionarioCommittente/Nome',
      example: 'Giuseppe',
      required: false, // Either this+Cognome or Denominazione
      validation: 'First name',
    },
    {
      id: '1.4.1.3.3',
      name: 'CessionarioCommittente/Cognome',
      example: 'Verdi',
      required: false, // Either this+Nome or Denominazione
      validation: 'Last name',
    },
    {
      id: '1.4.2.4',
      name: 'CessionarioCommittente/Indirizzo',
      example: 'Via Milano 456',
      required: true,
      validation: 'Address',
    },
    {
      id: '1.4.2.5',
      name: 'CessionarioCommittente/NumeroCivico',
      example: '456',
      required: false,
      validation: 'Street number',
    },
    {
      id: '1.4.2.6',
      name: 'CessionarioCommittente/CAP',
      example: '20100',
      required: true,
      validation: '5 digits',
    },
    {
      id: '1.4.2.7',
      name: 'CessionarioCommittente/Comune',
      example: 'Milano',
      required: true,
      validation: 'City name',
    },
    {
      id: '1.4.2.8',
      name: 'CessionarioCommittente/Provincia',
      example: 'MI',
      required: false,
      validation: 'Province code',
    },
    {
      id: '1.4.2.9',
      name: 'CessionarioCommittente/Nazione',
      example: 'IT',
      required: true,
      validation: 'ISO 3166-1 alpha-2 country code',
    },
    {
      id: '2.1.1.1',
      name: 'TipoDocumento',
      example: 'TD01',
      required: true,
      validation: 'TD01-TD28',
    },
    {
      id: '2.1.1.2',
      name: 'Divisa',
      example: 'EUR',
      required: true,
      validation: 'ISO 4217 currency code',
    },
    {
      id: '2.1.1.3',
      name: 'Data',
      example: '2024-01-15',
      required: false,
      validation: 'YYYY-MM-DD format',
    },
    {
      id: '2.1.1.4',
      name: 'Numero',
      example: 'FAT-2024-001',
      required: true,
      validation: 'Invoice number',
    },
    {
      id: '2.1.1.5',
      name: 'ImportoTotaleDocumento',
      example: '8.81',
      required: false,
      validation: 'Total document amount',
    },
    {
      id: '1.6',
      name: 'SoggettoEmittente',
      example: 'CC',
      required: false,
      validation: 'Subject issuer code',
    },
  ],
  notes: [
    'The Excel file must have a header row with "ID e Nome" containing the ID-to-tag mappings',
    'Data rows start from row 2',
    'Each column should have a corresponding ID code at the bottom',
    'At least one DettaglioLinee (2.2.2.*) and DatiRiepilogo (2.2.1.*) entry is required',
    'At least one DettaglioPagamento (2.4.2.*) entry is required',
    'For CedentePrestatore and CessionarioCommittente, either Denominazione OR (Nome + Cognome) is required',
    'For CessionarioCommittente, either IdFiscaleIVA OR CodiceFiscale is required',
  ],
};
