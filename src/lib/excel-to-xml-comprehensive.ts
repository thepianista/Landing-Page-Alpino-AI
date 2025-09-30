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

// No validation - use data as found in Excel

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

  // Step 1.5: Get values from Excel without validation
  // Helper function to get first value without validation
  function getFirstValue(id: string): string | null {
    const values = valuesById[id];
    if (!values || values.length === 0 || !values[0]) {
      return null;
    }
    return values[0].trim() || null;
  }

  // Get DatiTrasmissione fields
  const idPaese = getFirstValue('1.1.1.1');
  const idCodice = getFirstValue('1.1.1.2');
  const progressivoInvio = getFirstValue('1.1.2');
  const formatoTrasmissione = getFirstValue('1.1.3') || 'FPR12';
  const codiceDestinatario = getFirstValue('1.1.4') || '0000000';

  // Get CedentePrestatore fields
  const cedenteIdPaese = getFirstValue('1.2.1.1.1');
  const cedenteIdCodice = getFirstValue('1.2.1.1.2');
  const cedenteDenominazione = getFirstValue('1.2.1.3.1');
  const cedenteNome = getFirstValue('1.2.1.3.2');
  const cedenteCognome = getFirstValue('1.2.1.3.3');
  const regimeFiscale = getFirstValue('1.2.1.6');
  const cedenteIndirizzo = getFirstValue('1.2.2.4');
  const cedenteNumeroCivico = getFirstValue('1.2.2.5');
  const cedenteCAP = getFirstValue('1.2.2.6');
  const cedenteComune = getFirstValue('1.2.2.7');
  const cedenteProvincia = getFirstValue('1.2.2.9');
  const cedenteNazione = getFirstValue('1.2.2.10');

  // Get CessionarioCommittente fields
  const cessionarioIdPaese = getFirstValue('1.4.1.1.1');
  const cessionarioIdCodice = getFirstValue('1.4.1.1.2');
  const cessionarioCodiceFiscale = getFirstValue('1.4.1.2');
  const cessionarioDenominazione = getFirstValue('1.4.1.3.1');
  const cessionarioNome = getFirstValue('1.4.1.3.2');
  const cessionarioCognome = getFirstValue('1.4.1.3.3');
  const cessionarioIndirizzo = getFirstValue('1.4.2.4');
  const cessionarioNumeroCivico = getFirstValue('1.4.2.5');
  const cessionarioCAP = getFirstValue('1.4.2.6');
  const cessionarioComune = getFirstValue('1.4.2.7');
  const cessionarioProvincia = getFirstValue('1.4.2.8');
  const cessionarioNazione = getFirstValue('1.4.2.9');

  // Get DatiGeneraliDocumento fields
  const tipoDocumento = getFirstValue('2.1.1.1');
  const divisa = getFirstValue('2.1.1.2');
  const numero = getFirstValue('2.1.1.4');
  const data = getFirstValue('2.1.1.3');
  const importoTotaleDocumento = getFirstValue('2.1.1.5');

  // Get SoggettoEmittente (optional)
  const soggettoEmittente = getFirstValue('1.6');

  // No validation - use data as found in Excel

  // Step 1.6: Create mandatory XML structure with validated values
  // Create FatturaElettronicaHeader
  const header = (root as any).ele('FatturaElettronicaHeader');

  // Create DatiTrasmissione
  const datiTrasmissione = (header as any).ele('DatiTrasmissione');
  const idTrasmittente = (datiTrasmissione as any).ele('IdTrasmittente');
  if (idPaese) (idTrasmittente as any).ele('IdPaese').txt(idPaese);
  if (idCodice) (idTrasmittente as any).ele('IdCodice').txt(idCodice);
  if (progressivoInvio) (datiTrasmissione as any).ele('ProgressivoInvio').txt(progressivoInvio);
  (datiTrasmissione as any).ele('FormatoTrasmissione').txt(formatoTrasmissione);
  (datiTrasmissione as any).ele('CodiceDestinatario').txt(codiceDestinatario);

  // Create CedentePrestatore
  const cedentePrestatore = (header as any).ele('CedentePrestatore');
  const cedenteDatiAnagrafici = (cedentePrestatore as any).ele('DatiAnagrafici');

  if (cedenteIdPaese && cedenteIdCodice) {
    const cedenteIdFiscaleIVA = (cedenteDatiAnagrafici as any).ele('IdFiscaleIVA');
    (cedenteIdFiscaleIVA as any).ele('IdPaese').txt(cedenteIdPaese);
    (cedenteIdFiscaleIVA as any).ele('IdCodice').txt(cedenteIdCodice);
  }

  const cedenteAnagrafica = (cedenteDatiAnagrafici as any).ele('Anagrafica');
  if (cedenteDenominazione) {
    (cedenteAnagrafica as any).ele('Denominazione').txt(cedenteDenominazione);
  } else if (cedenteNome && cedenteCognome) {
    (cedenteAnagrafica as any).ele('Nome').txt(cedenteNome);
    (cedenteAnagrafica as any).ele('Cognome').txt(cedenteCognome);
  }

  if (regimeFiscale) (cedenteDatiAnagrafici as any).ele('RegimeFiscale').txt(regimeFiscale);

  const cedenteSede = (cedentePrestatore as any).ele('Sede');
  if (cedenteIndirizzo) (cedenteSede as any).ele('Indirizzo').txt(cedenteIndirizzo);
  if (cedenteNumeroCivico) (cedenteSede as any).ele('NumeroCivico').txt(cedenteNumeroCivico);
  if (cedenteCAP) (cedenteSede as any).ele('CAP').txt(cedenteCAP);
  if (cedenteComune) (cedenteSede as any).ele('Comune').txt(cedenteComune);
  if (cedenteProvincia) (cedenteSede as any).ele('Provincia').txt(cedenteProvincia);
  if (cedenteNazione) (cedenteSede as any).ele('Nazione').txt(cedenteNazione);

  // Create CessionarioCommittente
  const cessionarioCommittente = (header as any).ele('CessionarioCommittente');
  const cessionarioDatiAnagrafici = (cessionarioCommittente as any).ele('DatiAnagrafici');

  if (cessionarioIdPaese && cessionarioIdCodice) {
    const cessionarioIdFiscaleIVA = (cessionarioDatiAnagrafici as any).ele('IdFiscaleIVA');
    (cessionarioIdFiscaleIVA as any).ele('IdPaese').txt(cessionarioIdPaese);
    (cessionarioIdFiscaleIVA as any).ele('IdCodice').txt(cessionarioIdCodice);
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
  if (cessionarioIndirizzo) (cessionarioSede as any).ele('Indirizzo').txt(cessionarioIndirizzo);
  if (cessionarioNumeroCivico) (cessionarioSede as any).ele('NumeroCivico').txt(cessionarioNumeroCivico);
  if (cessionarioCAP) (cessionarioSede as any).ele('CAP').txt(cessionarioCAP);
  if (cessionarioComune) (cessionarioSede as any).ele('Comune').txt(cessionarioComune);
  if (cessionarioProvincia) (cessionarioSede as any).ele('Provincia').txt(cessionarioProvincia);
  if (cessionarioNazione) (cessionarioSede as any).ele('Nazione').txt(cessionarioNazione);

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
  if (tipoDocumento) (datiGeneraliDocumento as any).ele('TipoDocumento').txt(tipoDocumento);
  if (divisa) (datiGeneraliDocumento as any).ele('Divisa').txt(divisa);
  if (data) (datiGeneraliDocumento as any).ele('Data').txt(data);
  if (numero) (datiGeneraliDocumento as any).ele('Numero').txt(numero);
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
