/**
 * Comprehensive Excel to XML converter for Italian electronic invoices (Fattura Elettronica)
 *
 * This TypeScript implementation provides the same functionality as the Python script
 * excel-to-xml.py, converting hierarchical mapping Excel files into individual XML invoices.
 *
 * Features:
 * - Reads hierarchical mapping workbooks to determine column-to-ID mappings
 * - Uses official representation to build tag name paths for each ID
 * - Handles JSON arrays in Excel cells for repeated elements
 * - Generates properly formatted XML invoices with correct namespaces
 * - Supports both XSD and Portal modes for different validation requirements
 */

import ExcelJS from 'exceljs';
import { create } from 'xmlbuilder';
import { Buffer as NodeBuffer } from 'node:buffer';

// Types and interfaces
type GenMode = 'xsd' | 'portal';

interface XmlOptions {
  mode?: GenMode;
  includeXmlDecl?: boolean;
}

interface ExcelToXmlResult {
  filename: string;
  xml: string;
}

interface IdToTagMap {
  [id: string]: string;
}

interface IdToPathMap {
  [id: string]: string[];
}

interface ColumnToIdMap {
  [column: number]: string;
}

interface ValuesByIdMap {
  [id: string]: string[];
}

// Utility functions
function toNodeBuffer(src: ArrayBuffer | Uint8Array | NodeBuffer): NodeBuffer {
  if (NodeBuffer.isBuffer(src)) return src;
  if (src instanceof Uint8Array) return NodeBuffer.from(src.buffer, src.byteOffset, src.byteLength);
  return NodeBuffer.from(src as ArrayBuffer);
}

function cellStr(value: any): string | null {
  if (value == null) return null;
  if (typeof value === 'object') {
    if ((value as any).text) return String((value as any).text);
    if ((value as any).result !== undefined) return String((value as any).result);
    if ((value as Date) instanceof Date) return (value as Date).toISOString().slice(0, 10);
    try {
      return String(value);
    } catch {
      return null;
    }
  }
  const s = String(value);
  return s.length ? s : null;
}

function parseMaybeJsonArray(value: any): string[] {
  const s = cellStr(value);
  if (!s || !s.trim()) return [];
  const t = s.trim();
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // If JSON parsing fails, treat as single string
    }
  }
  return [s];
}

// Regular expressions for ID and tag parsing
const ID_TAG_PATTERN = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/;
const ID_ONLY_PATTERN = /^\s*(\d+(?:\.\d+)*)\b/;

// Validation constants
const VALID_COUNTRIES = new Set([
  'AF',
  'AX',
  'AL',
  'DZ',
  'AS',
  'AD',
  'AO',
  'AI',
  'AQ',
  'AG',
  'AR',
  'AM',
  'AW',
  'AU',
  'AT',
  'AZ',
  'BS',
  'BH',
  'BD',
  'BB',
  'BY',
  'BE',
  'BZ',
  'BJ',
  'BM',
  'BT',
  'BO',
  'BQ',
  'BA',
  'BW',
  'BV',
  'BR',
  'IO',
  'BN',
  'BG',
  'BF',
  'BI',
  'KH',
  'CM',
  'CA',
  'CV',
  'KY',
  'CF',
  'TD',
  'CL',
  'CN',
  'CX',
  'CC',
  'CO',
  'KM',
  'CG',
  'CD',
  'CK',
  'CR',
  'CI',
  'HR',
  'CU',
  'CW',
  'CY',
  'CZ',
  'DK',
  'DJ',
  'DM',
  'DO',
  'EC',
  'EG',
  'SV',
  'GQ',
  'ER',
  'EE',
  'ET',
  'FK',
  'FO',
  'FJ',
  'FI',
  'FR',
  'GF',
  'PF',
  'TF',
  'GA',
  'GM',
  'GE',
  'DE',
  'GH',
  'GI',
  'GR',
  'GL',
  'GD',
  'GP',
  'GU',
  'GT',
  'GG',
  'GN',
  'GW',
  'GY',
  'HT',
  'HM',
  'VA',
  'HN',
  'HK',
  'HU',
  'IS',
  'IN',
  'ID',
  'IR',
  'IQ',
  'IE',
  'IM',
  'IL',
  'IT',
  'JM',
  'JP',
  'JE',
  'JO',
  'KZ',
  'KE',
  'KI',
  'KP',
  'KR',
  'KW',
  'KG',
  'LA',
  'LV',
  'LB',
  'LS',
  'LR',
  'LY',
  'LI',
  'LT',
  'LU',
  'MO',
  'MK',
  'MG',
  'MW',
  'MY',
  'MV',
  'ML',
  'MT',
  'MH',
  'MQ',
  'MR',
  'MU',
  'YT',
  'MX',
  'FM',
  'MD',
  'MC',
  'MN',
  'ME',
  'MS',
  'MA',
  'MZ',
  'MM',
  'NA',
  'NR',
  'NP',
  'NL',
  'NC',
  'NZ',
  'NI',
  'NE',
  'NG',
  'NU',
  'NF',
  'MP',
  'NO',
  'OM',
  'PK',
  'PW',
  'PS',
  'PA',
  'PG',
  'PY',
  'PE',
  'PH',
  'PN',
  'PL',
  'PT',
  'PR',
  'QA',
  'RE',
  'RO',
  'RU',
  'RW',
  'BL',
  'SH',
  'KN',
  'LC',
  'MF',
  'PM',
  'VC',
  'WS',
  'SM',
  'ST',
  'SA',
  'SN',
  'RS',
  'SC',
  'SL',
  'SG',
  'SX',
  'SK',
  'SI',
  'SB',
  'SO',
  'ZA',
  'GS',
  'SS',
  'ES',
  'LK',
  'SD',
  'SR',
  'SJ',
  'SZ',
  'SE',
  'CH',
  'SY',
  'TW',
  'TJ',
  'TZ',
  'TH',
  'TL',
  'TG',
  'TK',
  'TO',
  'TT',
  'TN',
  'TR',
  'TM',
  'TC',
  'TV',
  'UG',
  'UA',
  'AE',
  'GB',
  'US',
  'UM',
  'UY',
  'UZ',
  'VU',
  'VE',
  'VN',
  'VG',
  'VI',
  'WF',
  'EH',
  'YE',
  'ZM',
  'ZW',
  'XK',
  'XI',
  'OO',
  'EL',
]);

const VALID_REGIME_FISCALE = new Set([
  'RF01',
  'RF02',
  'RF04',
  'RF05',
  'RF06',
  'RF07',
  'RF08',
  'RF09',
  'RF10',
  'RF11',
  'RF12',
  'RF13',
  'RF14',
  'RF15',
  'RF16',
  'RF17',
  'RF18',
  'RF19',
]);

const VALID_TIPO_DOCUMENTO = new Set([
  'TD01',
  'TD02',
  'TD03',
  'TD04',
  'TD05',
  'TD06',
  'TD16',
  'TD17',
  'TD18',
  'TD19',
  'TD20',
  'TD21',
  'TD22',
  'TD23',
  'TD24',
  'TD25',
  'TD26',
  'TD27',
  'TD28',
]);

const VALID_DIVISA = new Set([
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BOV',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHE',
  'CHF',
  'CHW',
  'CLF',
  'CLP',
  'CNY',
  'COP',
  'COU',
  'CRC',
  'CUC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HRK',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MXV',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SLL',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TVD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'USN',
  'UYI',
  'UYU',
  'UYW',
  'UZS',
  'VED',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XAG',
  'XAU',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XCD',
  'XDR',
  'XOF',
  'XPD',
  'XPF',
  'XPT',
  'XSU',
  'XTS',
  'XUA',
  'XXX',
  'YER',
  'ZAR',
  'ZMW',
  'ZWL',
]);

// Validation helper functions
function validateCountryCode(value: string, fieldName: string): string {
  const upperValue = value.toUpperCase().trim();
  if (!VALID_COUNTRIES.has(upperValue)) {
    throw new Error(`${fieldName} inválido: "${value}". Debe ser un código ISO 3166-1 alpha-2 válido.`);
  }
  return upperValue;
}

function validateRegimeFiscale(value: string): string {
  const upperValue = value.toUpperCase().trim();
  if (!VALID_REGIME_FISCALE.has(upperValue)) {
    throw new Error(
      `RegimeFiscale inválido: "${value}". Valores aceptados: ${Array.from(VALID_REGIME_FISCALE).join(', ')}`
    );
  }
  return upperValue;
}

function validateTipoDocumento(value: string): string {
  const upperValue = value.toUpperCase().trim();
  if (!VALID_TIPO_DOCUMENTO.has(upperValue)) {
    throw new Error(
      `TipoDocumento inválido: "${value}". Valores aceptados: ${Array.from(VALID_TIPO_DOCUMENTO).join(', ')}`
    );
  }
  return upperValue;
}

function validateDivisa(value: string): string {
  const upperValue = value.toUpperCase().trim();
  if (!VALID_DIVISA.has(upperValue)) {
    throw new Error(`Divisa inválida: "${value}". Debe ser un código ISO 4217 válido.`);
  }
  return upperValue;
}

function validateCAP(value: string, fieldName: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length !== 5) {
    throw new Error(`${fieldName} inválido: "${value}". Debe tener exactamente 5 dígitos.`);
  }
  return cleanValue;
}

function validateProgressivoInvio(value: string): string {
  const cleanValue = value.trim();
  if (!/^[0-9A-Za-z]+$/.test(cleanValue)) {
    throw new Error(`ProgressivoInvio inválido: "${value}". Debe ser alfanumérico.`);
  }
  return cleanValue;
}

function validateIdCodice(value: string): string {
  const cleanValue = value.trim();
  if (!/^[0-9A-Za-z._-]+$/.test(cleanValue)) {
    throw new Error(
      `IdCodice inválido: "${value}". Debe contener solo caracteres alfanuméricos, puntos, guiones bajos y guiones.`
    );
  }
  return cleanValue;
}

/**
 * Build mapping from ID codes to tag names from the representation Excel file
 */
function buildIdToTagMap(representationXlsx: string): IdToTagMap {
  // This function would read from a separate representation file
  // For now, we'll use the same approach as the existing implementation
  // which reads from the same sheet
  throw new Error('buildIdToTagMap from separate file not implemented - use buildIdToTagMapFromSameSheet instead');
}

/**
 * Build mapping from ID codes to tag names from the same worksheet
 */
function buildIdToTagMapFromSameSheet(worksheet: ExcelJS.Worksheet): IdToTagMap {
  const idToTag: IdToTagMap = {};
  const maxRow = (worksheet as any).actualRowCount ?? worksheet.rowCount;
  const maxCol = (worksheet as any).actualColumnCount ?? worksheet.columnCount;

  // Find the "ID e Nome" header row
  let headerRow = -1;
  for (let r = 1; r <= maxRow; r++) {
    const value = cellStr(worksheet.getRow(r).getCell(1).value);
    if (value && /ID\s*e\s*Nome/i.test(value)) {
      headerRow = r;
      break;
    }
  }

  if (headerRow > 0) {
    // Parse from header row onwards
    for (let r = headerRow + 1; r <= maxRow; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= maxCol; c++) {
        const text = cellStr(row.getCell(c).value);
        if (!text) continue;
        const match = text.match(ID_TAG_PATTERN);
        if (match) {
          idToTag[match[1]] = match[2];
          break;
        }
      }
    }
    if (Object.keys(idToTag).length > 0) return idToTag;
  }

  // Fallback: search first 10 rows
  const topRows = Math.min(10, maxRow);
  for (let r = 1; r <= topRows; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= maxCol; c++) {
      const text = cellStr(row.getCell(c).value);
      if (!text) continue;
      const match = text.match(ID_TAG_PATTERN);
      if (match) {
        idToTag[match[1]] = match[2];
      }
    }
  }

  if (Object.keys(idToTag).length === 0) {
    throw new Error('Could not build ID->Tag mapping from the same sheet');
  }
  return idToTag;
}

/**
 * Build mapping from ID codes to paths of tag names
 */
function buildIdToPath(idToTag: IdToTagMap): IdToPathMap {
  const idToPath: IdToPathMap = {};

  for (const idCode of Object.keys(idToTag)) {
    const parts = idCode.split('.');
    const path: string[] = [];

    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      const tag = idToTag[prefix];
      if (tag) {
        path.push(tag);
      }
    }

    idToPath[idCode] = path;
  }

  return idToPath;
}

/**
 * Extract leaf IDs for each column by scanning from bottom row up
 */
function extractLeafIds(worksheet: ExcelJS.Worksheet): ColumnToIdMap {
  const maxRow = (worksheet as any).actualRowCount ?? worksheet.rowCount;
  const maxCol = (worksheet as any).actualColumnCount ?? worksheet.columnCount;
  const colToId: ColumnToIdMap = {};

  for (let col = 1; col <= maxCol; col++) {
    let idCode: string | null = null;

    // Search from bottom row up
    for (let row = maxRow; row >= 1; row--) {
      const value = cellStr(worksheet.getRow(row).getCell(col).value);
      if (value && value.includes('<')) {
        const match = value.match(ID_ONLY_PATTERN);
        if (match) {
          idCode = match[1];
          break;
        }
      }
    }

    if (idCode) {
      colToId[col] = idCode;
    }
  }

  return colToId;
}

/**
 * Ensure the sequence of nested elements defined by path exists under root
 */
function createPath(root: any, path: string[]): any {
  let current = root;
  for (const tag of path) {
    let child = null;

    // Try to find existing child with same tag
    const children = (current as any).children as any[] | undefined;
    if (children) {
      for (const elem of children) {
        if (elem?.name === tag) {
          child = elem;
          break;
        }
      }
    }

    if (!child) {
      child = (current as any).ele(tag);
    }
    current = child;
  }

  return current;
}

/**
 * Process a single row and build XML tree for an invoice
 */
function processRow(rowValues: any[], leafIds: ColumnToIdMap, idToPath: IdToPathMap, options: XmlOptions = {}): string {
  const { mode = 'xsd', includeXmlDecl = true } = options;

  // Create root element
  const root = includeXmlDecl
    ? create('FatturaElettronica', { version: '1.0', encoding: 'utf-8' })
    : create('FatturaElettronica');

  // Step 1: Collect values for each ID, normalizing JSON arrays into lists
  const valuesById: ValuesByIdMap = {};
  for (const [colIdx, idCode] of Object.entries(leafIds)) {
    const columnIndex = parseInt(colIdx);
    if (columnIndex - 1 >= rowValues.length) continue;

    const value = rowValues[columnIndex - 1];
    if (value == null || value === '') continue;

    const items = parseMaybeJsonArray(value);
    if (items.length > 0) {
      valuesById[idCode] = items;
    }
  }

  // Step 1.5: Validate mandatory fields and apply validations
  const validationErrors: string[] = [];

  // Helper function to get first value and validate it exists
  function getFirstValue(id: string, fieldName: string): string | null {
    const values = valuesById[id];
    if (!values || values.length === 0 || !values[0] || values[0].trim() === '') {
      validationErrors.push(`${fieldName} es obligatorio (ID ${id})`);
      return null;
    }
    return values[0].trim();
  }

  // Validate DatiTrasmissione fields
  const idPaese = getFirstValue('1.1.1.1', 'IdTrasmittente/IdPaese');
  const idCodice = getFirstValue('1.1.1.2', 'IdTrasmittente/IdCodice');
  const progressivoInvio = getFirstValue('1.1.2', 'ProgressivoInvio');
  const formatoTrasmissione = getFirstValue('1.1.3', 'FormatoTrasmissione') || 'FPR12';
  const codiceDestinatario = getFirstValue('1.1.4', 'CodiceDestinatario') || '0000000';

  // Validate CedentePrestatore fields
  const cedenteIdPaese = getFirstValue('1.2.1.1.1', 'CedentePrestatore/IdFiscaleIVA/IdPaese');
  const cedenteIdCodice = getFirstValue('1.2.1.1.2', 'CedentePrestatore/IdFiscaleIVA/IdCodice');
  const cedenteDenominazione = getFirstValue('1.2.1.3.1', 'CedentePrestatore/Denominazione');
  const cedenteNome = getFirstValue('1.2.1.3.2', 'CedentePrestatore/Nome');
  const cedenteCognome = getFirstValue('1.2.1.3.3', 'CedentePrestatore/Cognome');
  const regimeFiscale = getFirstValue('1.2.1.6', 'CedentePrestatore/RegimeFiscale');
  const cedenteIndirizzo = getFirstValue('1.2.2.4', 'CedentePrestatore/Indirizzo');
  const cedenteNumeroCivico = getFirstValue('1.2.2.5', 'CedentePrestatore/NumeroCivico');
  const cedenteCAP = getFirstValue('1.2.2.6', 'CedentePrestatore/CAP');
  const cedenteComune = getFirstValue('1.2.2.7', 'CedentePrestatore/Comune');
  const cedenteProvincia = getFirstValue('1.2.2.9', 'CedentePrestatore/Provincia');
  const cedenteNazione = getFirstValue('1.2.2.10', 'CedentePrestatore/Nazione');

  // Validate CessionarioCommittente fields
  const cessionarioIdPaese = getFirstValue('1.4.1.1.1', 'CessionarioCommittente/IdFiscaleIVA/IdPaese');
  const cessionarioIdCodice = getFirstValue('1.4.1.1.2', 'CessionarioCommittente/IdFiscaleIVA/IdCodice');
  const cessionarioCodiceFiscale = getFirstValue('1.4.1.2', 'CessionarioCommittente/CodiceFiscale');
  const cessionarioDenominazione = getFirstValue('1.4.1.3.1', 'CessionarioCommittente/Denominazione');
  const cessionarioNome = getFirstValue('1.4.1.3.2', 'CessionarioCommittente/Nome');
  const cessionarioCognome = getFirstValue('1.4.1.3.3', 'CessionarioCommittente/Cognome');
  const cessionarioIndirizzo = getFirstValue('1.4.2.4', 'CessionarioCommittente/Indirizzo');
  const cessionarioNumeroCivico = getFirstValue('1.4.2.5', 'CessionarioCommittente/NumeroCivico');
  const cessionarioCAP = getFirstValue('1.4.2.6', 'CessionarioCommittente/CAP');
  const cessionarioComune = getFirstValue('1.4.2.7', 'CessionarioCommittente/Comune');
  const cessionarioProvincia = getFirstValue('1.4.2.8', 'CessionarioCommittente/Provincia');
  const cessionarioNazione = getFirstValue('1.4.2.9', 'CessionarioCommittente/Nazione');

  // Validate DatiGeneraliDocumento fields
  const tipoDocumento = getFirstValue('2.1.1.1', 'TipoDocumento');
  const divisa = getFirstValue('2.1.1.2', 'Divisa');
  const numero = getFirstValue('2.1.1.4', 'Numero');
  const data = getFirstValue('2.1.1.3', 'Data');
  const importoTotaleDocumento = getFirstValue('2.1.1.5', 'ImportoTotaleDocumento');

  // Validate SoggettoEmittente (optional)
  const soggettoEmittente = getFirstValue('1.6', 'SoggettoEmittente');

  // Check if at least one of IdFiscaleIVA or CodiceFiscale is present for CessionarioCommittente
  const hasCessionarioIdFiscale = cessionarioIdPaese && cessionarioIdCodice;
  const hasCessionarioCodiceFiscale = cessionarioCodiceFiscale;
  if (!hasCessionarioIdFiscale && !hasCessionarioCodiceFiscale) {
    validationErrors.push(
      'CessionarioCommittente: debe existir IdFiscaleIVA (1.4.1.1.1 + 1.4.1.1.2) o CodiceFiscale (1.4.1.2)'
    );
  }

  // Check if at least one of Denominazione or (Nome + Cognome) is present for CedentePrestatore
  const hasCedenteDenominazione = cedenteDenominazione;
  const hasCedenteNomeCognome = cedenteNome && cedenteCognome;
  if (!hasCedenteDenominazione && !hasCedenteNomeCognome) {
    validationErrors.push(
      'CedentePrestatore: debe existir Denominazione (1.2.1.3.1) o (Nome 1.2.1.3.2 + Cognome 1.2.1.3.3)'
    );
  }

  // Check if at least one of Denominazione or (Nome + Cognome) is present for CessionarioCommittente
  const hasCessionarioDenominazione = cessionarioDenominazione;
  const hasCessionarioNomeCognome = cessionarioNome && cessionarioCognome;
  if (!hasCessionarioDenominazione && !hasCessionarioNomeCognome) {
    validationErrors.push(
      'CessionarioCommittente: debe existir Denominazione (1.4.1.3.1) o (Nome 1.4.1.3.2 + Cognome 1.4.1.3.3)'
    );
  }

  // Apply validations to valid values
  try {
    if (idPaese) validateCountryCode(idPaese, 'IdTrasmittente/IdPaese');
    if (idCodice) validateIdCodice(idCodice);
    if (progressivoInvio) validateProgressivoInvio(progressivoInvio);
    if (cedenteIdPaese) validateCountryCode(cedenteIdPaese, 'CedentePrestatore/IdFiscaleIVA/IdPaese');
    if (cedenteIdCodice) validateIdCodice(cedenteIdCodice);
    if (regimeFiscale) validateRegimeFiscale(regimeFiscale);
    if (cedenteCAP) validateCAP(cedenteCAP, 'CedentePrestatore/CAP');
    if (cedenteNazione) validateCountryCode(cedenteNazione, 'CedentePrestatore/Nazione');
    if (cessionarioIdPaese) validateCountryCode(cessionarioIdPaese, 'CessionarioCommittente/IdFiscaleIVA/IdPaese');
    if (cessionarioIdCodice) validateIdCodice(cessionarioIdCodice);
    if (cessionarioCAP) validateCAP(cessionarioCAP, 'CessionarioCommittente/CAP');
    if (cessionarioNazione) validateCountryCode(cessionarioNazione, 'CessionarioCommittente/Nazione');
    if (tipoDocumento) validateTipoDocumento(tipoDocumento);
    if (divisa) validateDivisa(divisa);
  } catch (error) {
    validationErrors.push(error instanceof Error ? error.message : String(error));
  }

  // Check for mandatory DatiBeniServizi sections
  const hasDettaglioLinee = Object.keys(valuesById).some((id) => id.startsWith('2.2.2.'));
  const hasDatiRiepilogo = Object.keys(valuesById).some((id) => id.startsWith('2.2.1.'));
  if (!hasDettaglioLinee) {
    validationErrors.push('DatiBeniServizi/DettaglioLinee es obligatorio (faltan campos 2.2.2.*)');
  }
  if (!hasDatiRiepilogo) {
    validationErrors.push('DatiBeniServizi/DatiRiepilogo es obligatorio (faltan campos 2.2.1.*)');
  }

  // Check for mandatory DatiPagamento section
  const hasDettaglioPagamento = Object.keys(valuesById).some((id) => id.startsWith('2.4.2.'));
  if (!hasDettaglioPagamento) {
    validationErrors.push('DatiPagamento/DettaglioPagamento es obligatorio (faltan campos 2.4.2.*)');
  }

  // If there are validation errors, throw them
  if (validationErrors.length > 0) {
    throw new Error('Errores de validación:\n- ' + validationErrors.join('\n- '));
  }

  // Step 1.6: Create mandatory XML structure with validated values
  // Create FatturaElettronicaHeader
  const header = (root as any).ele('FatturaElettronicaHeader');

  // Create DatiTrasmissione
  const datiTrasmissione = (header as any).ele('DatiTrasmissione');
  const idTrasmittente = (datiTrasmissione as any).ele('IdTrasmittente');
  (idTrasmittente as any).ele('IdPaese').txt(validateCountryCode(idPaese!, 'IdTrasmittente/IdPaese'));
  (idTrasmittente as any).ele('IdCodice').txt(validateIdCodice(idCodice!));
  (datiTrasmissione as any).ele('ProgressivoInvio').txt(validateProgressivoInvio(progressivoInvio!));
  (datiTrasmissione as any).ele('FormatoTrasmissione').txt(formatoTrasmissione);
  (datiTrasmissione as any).ele('CodiceDestinatario').txt(codiceDestinatario);

  // Create CedentePrestatore
  const cedentePrestatore = (header as any).ele('CedentePrestatore');
  const cedenteDatiAnagrafici = (cedentePrestatore as any).ele('DatiAnagrafici');
  const cedenteIdFiscaleIVA = (cedenteDatiAnagrafici as any).ele('IdFiscaleIVA');
  (cedenteIdFiscaleIVA as any)
    .ele('IdPaese')
    .txt(validateCountryCode(cedenteIdPaese!, 'CedentePrestatore/IdFiscaleIVA/IdPaese'));
  (cedenteIdFiscaleIVA as any).ele('IdCodice').txt(validateIdCodice(cedenteIdCodice!));

  const cedenteAnagrafica = (cedenteDatiAnagrafici as any).ele('Anagrafica');
  if (cedenteDenominazione) {
    (cedenteAnagrafica as any).ele('Denominazione').txt(cedenteDenominazione);
  } else if (cedenteNome && cedenteCognome) {
    (cedenteAnagrafica as any).ele('Nome').txt(cedenteNome);
    (cedenteAnagrafica as any).ele('Cognome').txt(cedenteCognome);
  }

  (cedenteDatiAnagrafici as any).ele('RegimeFiscale').txt(validateRegimeFiscale(regimeFiscale!));

  const cedenteSede = (cedentePrestatore as any).ele('Sede');
  (cedenteSede as any).ele('Indirizzo').txt(cedenteIndirizzo!);
  if (cedenteNumeroCivico) (cedenteSede as any).ele('NumeroCivico').txt(cedenteNumeroCivico);
  (cedenteSede as any).ele('CAP').txt(validateCAP(cedenteCAP!, 'CedentePrestatore/CAP'));
  (cedenteSede as any).ele('Comune').txt(cedenteComune!);
  if (cedenteProvincia) (cedenteSede as any).ele('Provincia').txt(cedenteProvincia);
  (cedenteSede as any).ele('Nazione').txt(validateCountryCode(cedenteNazione!, 'CedentePrestatore/Nazione'));

  // Create CessionarioCommittente
  const cessionarioCommittente = (header as any).ele('CessionarioCommittente');
  const cessionarioDatiAnagrafici = (cessionarioCommittente as any).ele('DatiAnagrafici');

  if (cessionarioIdPaese && cessionarioIdCodice) {
    const cessionarioIdFiscaleIVA = (cessionarioDatiAnagrafici as any).ele('IdFiscaleIVA');
    (cessionarioIdFiscaleIVA as any)
      .ele('IdPaese')
      .txt(validateCountryCode(cessionarioIdPaese, 'CessionarioCommittente/IdFiscaleIVA/IdPaese'));
    (cessionarioIdFiscaleIVA as any).ele('IdCodice').txt(validateIdCodice(cessionarioIdCodice));
  }

  if (cessionarioCodiceFiscale) {
    (cessionarioDatiAnagrafici as any).ele('CodiceFiscale').txt(cessionarioCodiceFiscale);
  }

  const cessionarioAnagrafica = (cessionarioDatiAnagrafici as any).ele('Anagrafica');
  if (cessionarioDenominazione) {
    (cessionarioAnagrafica as any).ele('Denominazione').txt(cessionarioDenominazione);
  } else if (cessionarioNome && cessionarioCognome) {
    (cessionarioAnagrafica as any).ele('Nome').txt(cessionarioNome);
    (cessionarioAnagrafica as any).ele('Cognome').txt(cessionarioCognome);
  }

  const cessionarioSede = (cessionarioCommittente as any).ele('Sede');
  (cessionarioSede as any).ele('Indirizzo').txt(cessionarioIndirizzo!);
  if (cessionarioNumeroCivico) (cessionarioSede as any).ele('NumeroCivico').txt(cessionarioNumeroCivico);
  (cessionarioSede as any).ele('CAP').txt(validateCAP(cessionarioCAP!, 'CessionarioCommittente/CAP'));
  (cessionarioSede as any).ele('Comune').txt(cessionarioComune!);
  if (cessionarioProvincia) (cessionarioSede as any).ele('Provincia').txt(cessionarioProvincia);
  (cessionarioSede as any)
    .ele('Nazione')
    .txt(validateCountryCode(cessionarioNazione!, 'CessionarioCommittente/Nazione'));

  // Add SoggettoEmittente if present
  if (soggettoEmittente) {
    (header as any).ele('SoggettoEmittente').txt(soggettoEmittente);
  }

  // Create FatturaElettronicaBody
  const body = (root as any).ele('FatturaElettronicaBody');

  // Create DatiGenerali
  const datiGenerali = (body as any).ele('DatiGenerali');

  // Create DatiGeneraliDocumento
  const datiGeneraliDocumento = (datiGenerali as any).ele('DatiGeneraliDocumento');
  (datiGeneraliDocumento as any).ele('TipoDocumento').txt(validateTipoDocumento(tipoDocumento!));
  (datiGeneraliDocumento as any).ele('Divisa').txt(validateDivisa(divisa!));
  if (data) (datiGeneraliDocumento as any).ele('Data').txt(data);
  (datiGeneraliDocumento as any).ele('Numero').txt(numero!);
  if (importoTotaleDocumento) (datiGeneraliDocumento as any).ele('ImportoTotaleDocumento').txt(importoTotaleDocumento);

  // Step 2: Special handling for DatiOrdineAcquisto grouping
  const processedIds = new Set<string>();
  const datiOrdineIds = Object.keys(valuesById).filter((id) => id.includes('2.1.2.'));

  if (datiOrdineIds.length > 0) {
    const rifNumLineaId = '2.1.2.1';
    const idDocumentoId = '2.1.2.2';

    if (valuesById[rifNumLineaId] && valuesById[idDocumentoId]) {
      const rifValues = valuesById[rifNumLineaId];
      const idDocValues = valuesById[idDocumentoId];

      // Create the DatiGenerali element path
      const datiGeneraliPath = idToPath['2.1'];
      if (datiGeneraliPath) {
        const datiGeneraliElem = createPath(root, datiGeneraliPath);

        // Group RiferimentoNumeroLinea by their associated IdDocumento
        const idDocToRifMap = new Map<string, string[]>();

        if (rifValues.length === idDocValues.length) {
          // Direct mapping
          for (let i = 0; i < rifValues.length; i++) {
            const idDocVal = String(idDocValues[i]);
            if (!idDocToRifMap.has(idDocVal)) {
              idDocToRifMap.set(idDocVal, []);
            }
            idDocToRifMap.get(idDocVal)!.push(String(rifValues[i]));
          }
        } else if (rifValues.length > idDocValues.length && idDocValues.length >= 1) {
          // Group multiple RiferimentoNumeroLinea under fewer IdDocumento
          if (idDocValues.length >= 2) {
            idDocToRifMap.set(String(idDocValues[0]), [String(rifValues[0])]);
            idDocToRifMap.set(String(idDocValues[1]), rifValues.slice(1).map(String));
          } else {
            idDocToRifMap.set(String(idDocValues[0]), rifValues.map(String));
          }
        } else {
          // Map each RiferimentoNumeroLinea to corresponding IdDocumento
          for (let i = 0; i < Math.min(rifValues.length, idDocValues.length); i++) {
            const idDocVal = String(idDocValues[i]);
            if (!idDocToRifMap.has(idDocVal)) {
              idDocToRifMap.set(idDocVal, []);
            }
            idDocToRifMap.get(idDocVal)!.push(String(rifValues[i]));
          }
        }

        // Create DatiOrdineAcquisto elements based on grouping
        for (const [idDocVal, rifList] of idDocToRifMap) {
          const datiOrdineElem = (datiGeneraliElem as any).ele('DatiOrdineAcquisto');

          // Add all RiferimentoNumeroLinea elements for this group
          for (const rifVal of rifList) {
            (datiOrdineElem as any).ele('RiferimentoNumeroLinea').txt(String(rifVal).replace(/\n/g, ' ').trim());
          }

          // Add the IdDocumento element
          (datiOrdineElem as any).ele('IdDocumento').txt(String(idDocVal).replace(/\n/g, ' ').trim());

          // Add other fields (use first value for each field)
          for (const idCode of datiOrdineIds) {
            if (idCode === rifNumLineaId || idCode === idDocumentoId) continue;
            if (valuesById[idCode] && valuesById[idCode].length > 0) {
              const pathTags = idToPath[idCode] || [];
              const tagName = pathTags.length > 0 ? pathTags[pathTags.length - 1] : idCode.split('.').pop()!;
              const val = valuesById[idCode][0];
              if (val && val !== '') {
                (datiOrdineElem as any).ele(tagName).txt(String(val).replace(/\n/g, ' ').trim());
              }
            }
          }
        }

        // Mark these IDs as processed
        datiOrdineIds.forEach((id) => processedIds.add(id));
      }
    }
  }

  // Step 3: Group IDs by their prefix and handle repeated groups
  // Skip IDs that were already processed in the mandatory structure
  const mandatoryIds = new Set([
    '1.1.1.1',
    '1.1.1.2',
    '1.1.2',
    '1.1.3',
    '1.1.4',
    '1.2.1.1.1',
    '1.2.1.1.2',
    '1.2.1.3.1',
    '1.2.1.3.2',
    '1.2.1.3.3',
    '1.2.1.6',
    '1.2.2.4',
    '1.2.2.5',
    '1.2.2.6',
    '1.2.2.7',
    '1.2.2.9',
    '1.2.2.10',
    '1.4.1.1.1',
    '1.4.1.1.2',
    '1.4.1.2',
    '1.4.1.3.1',
    '1.4.1.3.2',
    '1.4.1.3.3',
    '1.4.2.4',
    '1.4.2.5',
    '1.4.2.6',
    '1.4.2.7',
    '1.4.2.8',
    '1.4.2.9',
    '1.6',
    '2.1.1.1',
    '2.1.1.2',
    '2.1.1.3',
    '2.1.1.4',
    '2.1.1.5',
  ]);

  const groups: { [prefix: string]: string[] } = {};
  for (const idCode of Object.keys(valuesById)) {
    if (processedIds.has(idCode) || mandatoryIds.has(idCode)) continue;

    const parts = idCode.split('.');
    const prefix = parts.length > 1 ? parts.slice(0, -1).join('.') : idCode;
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(idCode);
  }

  // Process groups - if any ID in the group has more than one value, treat as repeated group
  for (const [prefix, ids] of Object.entries(groups)) {
    const maxLen = Math.max(...ids.map((id) => valuesById[id].length));

    if (maxLen > 1 && prefix.split('.').length > 0) {
      // Determine the full path of tags for the group prefix
      let groupPath = idToPath[prefix];
      if (!groupPath || groupPath.length === 0) {
        const sampleId = ids[0];
        const samplePath = idToPath[sampleId];
        if (samplePath && samplePath.length > 1) {
          groupPath = samplePath.slice(0, -1);
        }
      }

      const groupParentPath = groupPath ? groupPath.slice(0, -1) : [];
      const groupTag = groupPath && groupPath.length > 0 ? groupPath[groupPath.length - 1] : null;

      if (groupTag) {
        // Sort IDs to respect numerical order within the group
        const sortedIds = [...ids].sort((a, b) => {
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const diff = (aParts[i] || 0) - (bParts[i] || 0);
            if (diff !== 0) return diff;
          }
          return 0;
        });

        for (let i = 0; i < maxLen; i++) {
          // Create a new group element for each occurrence
          const parentElemForGroup = createPath(root, groupParentPath);
          const groupElem = (parentElemForGroup as any).ele(groupTag);

          for (const idC of sortedIds) {
            const valuesList = valuesById[idC];
            if (i < valuesList.length) {
              const val = valuesList[i];
              if (val != null && val !== '') {
                const pathTags = idToPath[idC];
                if (pathTags && pathTags.length > 0) {
                  const leafTag = pathTags[pathTags.length - 1];
                  const textValue = String(val).replace(/\n/g, ' ').trim();
                  (groupElem as any).ele(leafTag).txt(textValue);
                }
              }
            }
          }
        }

        // Mark IDs as processed
        ids.forEach((id) => processedIds.add(id));
      }
    }
  }

  // Step 4: Handle non-repeated IDs (including those with single values)
  for (const [idCode, items] of Object.entries(valuesById)) {
    if (processedIds.has(idCode) || mandatoryIds.has(idCode)) continue;

    const pathTags = idToPath[idCode];
    if (!pathTags || pathTags.length === 0) continue;

    const parentPath = pathTags.slice(0, -1);
    const leafTag = pathTags[pathTags.length - 1];

    for (const val of items) {
      if (val != null && val !== '') {
        const parentElem = createPath(root, parentPath);
        (parentElem as any).ele(leafTag).txt(String(val).replace(/\n/g, ' ').trim());
      }
    }
  }

  // Set root attributes for namespace and version
  (root as any).att('xmlns', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');
  (root as any).att('versione', 'FPR12');

  // Set empty namespace on Header and Body for portal mode
  if (mode === 'portal') {
    (header as any).att('xmlns', '');
    (body as any).att('xmlns', '');
  }

  // Serialize to string
  return (root as any).end({ pretty: true }) as string;
}

/**
 * Main function to convert Excel to XML invoices
 */
export async function excelToXml(
  populatedExcel: ArrayBuffer | Uint8Array | NodeBuffer,
  options: XmlOptions = { mode: 'xsd', includeXmlDecl: true }
): Promise<ExcelToXmlResult[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toNodeBuffer(populatedExcel) as any);
  const worksheet = workbook.worksheets[0];

  // Build mappings
  const idToTag = buildIdToTagMapFromSameSheet(worksheet);
  const idToPath = buildIdToPath(idToTag);
  const leafIds = extractLeafIds(worksheet);

  const outputs: ExcelToXmlResult[] = [];
  let rowCounter = 0;

  const maxRow = (worksheet as any).actualRowCount ?? worksheet.rowCount;
  const maxCol = (worksheet as any).actualColumnCount ?? worksheet.columnCount;

  // Iterate rows starting from row 2
  for (let r = 2; r <= maxRow; r++) {
    const row = worksheet.getRow(r);
    const values: any[] = [];

    for (let c = 1; c <= maxCol; c++) {
      values.push(row.getCell(c).value);
    }

    // Skip rows with no data
    const nonEmptyValues = values.filter((v) => {
      const s = cellStr(v);
      return s && s.trim();
    });

    if (nonEmptyValues.length === 0) continue;

    // Skip rows that appear to be part of the header or mapping
    const looksLikeMapping = nonEmptyValues.every((v) => {
      const s = cellStr(v);
      return s && s.includes('<');
    });

    if (looksLikeMapping) continue;

    rowCounter++;
    const xml = processRow(values, leafIds, idToPath, options);
    outputs.push({
      filename: `invoice_${rowCounter}.xml`,
      xml,
    });
  }

  return outputs;
}

/**
 * Legacy function name for backward compatibility
 */
export const excelToXmlFromSingleXlsx = excelToXml;
