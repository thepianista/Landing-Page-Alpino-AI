/**
 * XML to Excel processor for Italian electronic invoices (Fattura Elettronica)
 * 
 * This TypeScript implementation provides the same functionality as the Python script
 * hierarchical_xml_to_excel_by_id_JSON.py, processing XML files and extracting data
 * using ID path mappings to populate Excel files.
 * 
 * Features:
 * - Processes individual XML files
 * - Uses ID to tag path mappings from representation Excel
 * - Handles JSON arrays for repeated fields
 * - Extracts values and structures them for Excel output
 */

import { parseStringPromise } from 'xml2js';
import ExcelJS from 'exceljs';
import { 
  IdToTagMap, 
  IdToPathMap, 
  ColumnToIdMap, 
  XmlProcessingResult, 
  BatchProcessingResult,
  XmlFile 
} from '@/types';

// Utility functions
function cellStr(value: any): string | null {
  if (value == null) return null;
  if (typeof value === 'object') {
    if ((value as any).text) return String((value as any).text);
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

// Regular expressions for ID and tag parsing
const ID_TAG_PATTERN = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/;
const ID_ONLY_PATTERN = /^\s*(\d+(?:\.\d+)*)\b/;

/**
 * Build mapping from ID codes to tag names from the representation Excel
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
 * Strip namespace from XML tag
 */
function nsStrip(tag: string): string {
  return tag.split('}').pop() || tag;
}

/**
 * Navigate XML tree following a path of tag names
 * This mimics the Python xml.etree.ElementTree navigation logic
 */
function navigateXmlPath(root: any, path: string[]): any[] {
  console.log(`Navigating path: [${path.join(' -> ')}]`);
  let nodes = [root];
  
  for (let i = 0; i < path.length; i++) {
    const tag = path[i];
    console.log(`Step ${i + 1}: Looking for tag "${tag}"`);
    console.log(`Current nodes: ${nodes.length}`);
    
    const nextNodes: any[] = [];
    
    for (const node of nodes) {
      if (node && typeof node === 'object') {
        // In xml2js, children are stored as properties of the object
        // We need to look for the tag as a property name
        console.log(`Node keys: [${Object.keys(node).join(', ')}]`);
        
        // Check if the tag exists as a direct property
        if (node[tag]) {
          console.log(`Found direct property "${tag}"`);
          const child = node[tag];
          if (Array.isArray(child)) {
            nextNodes.push(...child);
            console.log(`Added ${child.length} array elements`);
          } else {
            nextNodes.push(child);
            console.log(`Added single element`);
          }
        } else {
          // Check for namespaced versions
          const nodeKeys = Object.keys(node);
          let found = false;
          for (const key of nodeKeys) {
            const strippedKey = nsStrip(key);
            if (strippedKey === tag) {
              console.log(`Found namespaced property "${key}" -> "${strippedKey}"`);
              const child = node[key];
              if (Array.isArray(child)) {
                nextNodes.push(...child);
                console.log(`Added ${child.length} array elements`);
              } else {
                nextNodes.push(child);
                console.log(`Added single element`);
              }
              found = true;
            }
          }
          if (!found) {
            console.log(`Tag "${tag}" not found in keys: [${nodeKeys.join(', ')}]`);
          }
        }
      }
    }
    
    nodes = nextNodes;
    console.log(`After step ${i + 1}: ${nodes.length} nodes found`);
    
    if (nodes.length === 0) {
      console.log(`No nodes found at step ${i + 1}, stopping navigation`);
      break;
    }
  }
  
  console.log(`Final result: ${nodes.length} nodes`);
  return nodes;
}

/**
 * Extract text values from XML nodes
 * This mimics the Python logic: if node.text: text = node.text.strip()
 */
function extractTextValues(nodes: any[]): string[] {
  console.log(`Extracting text from ${nodes.length} nodes`);
  const values: string[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    console.log(`Node ${i + 1}: type=${typeof node}, isArray=${Array.isArray(node)}`);
    
    if (Array.isArray(node)) {
      // If it's an array, process each element
      console.log(`Node ${i + 1} is array with ${node.length} elements`);
      values.push(...extractTextValues(node));
    } else if (typeof node === 'string') {
      // Direct string value
      console.log(`Node ${i + 1} is string: "${node}"`);
      const trimmed = node.trim();
      if (trimmed) {
        values.push(trimmed);
        console.log(`Added string value: "${trimmed}"`);
      }
    } else if (node && typeof node === 'object') {
      // Object - look for text content
      console.log(`Node ${i + 1} is object with keys: [${Object.keys(node).join(', ')}]`);
      
      // In xml2js, text content is stored in the '_' property
      if (node._ !== undefined && node._ !== null) {
        const text = String(node._).trim();
        console.log(`Node ${i + 1} has text content: "${text}"`);
        if (text) {
          values.push(text);
          console.log(`Added text value: "${text}"`);
        }
      } else {
        console.log(`Node ${i + 1} has no text content (_ property is undefined/null)`);
        // Check if it's a leaf node with no children (empty element)
        const keys = Object.keys(node);
        if (keys.length === 0) {
          console.log(`Node ${i + 1} is empty element, adding empty string`);
          values.push('');
        }
      }
    } else {
      console.log(`Node ${i + 1} is null/undefined or unknown type`);
    }
  }
  
  console.log(`Extracted ${values.length} values: [${values.join(', ')}]`);
  return values;
}

/**
 * Parse XML values for each column from the XML
 */
async function parseXmlValues(
  xmlContent: string, 
  idToPath: IdToPathMap, 
  leafIds: ColumnToIdMap, 
  maxCol: number
): Promise<string[]> {
  try {
    console.log('=== XML PARSING DEBUG ===');
    console.log('XML Content length:', xmlContent.length);
    console.log('Number of columns:', maxCol);
    console.log('Leaf IDs found:', Object.keys(leafIds).length);
    
    const root = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false,
      charkey: '_'
    });
    
    console.log('XML parsed successfully');
    console.log('Root structure:', Object.keys(root));
    console.log('Root content preview:', JSON.stringify(root, null, 2).substring(0, 1000) + '...');
    
    const rowValues: string[] = new Array(maxCol).fill('');
    
    for (const [colStr, idCode] of Object.entries(leafIds)) {
      const col = parseInt(colStr);
      const path = idToPath[idCode];
      
      console.log(`\n--- Processing Column ${col} (ID: ${idCode}) ---`);
      console.log('Path:', path);
      
      if (!path || path.length === 0) {
        console.log('No path found for ID:', idCode);
        continue;
      }
      
      const nodes = navigateXmlPath(root, path);
      console.log('Nodes found:', nodes.length);
      console.log('Nodes structure:', nodes.map(node => typeof node === 'object' ? Object.keys(node) : typeof node));
      
      const values = extractTextValues(nodes);
      console.log('Values extracted:', values);
      
      if (values.length === 0) {
        rowValues[col - 1] = '';
        console.log('No values found, leaving empty');
      } else if (values.length === 1) {
        rowValues[col - 1] = values[0];
        console.log('Single value set:', values[0]);
      } else {
        // Multiple values - encode as JSON array
        rowValues[col - 1] = JSON.stringify(values);
        console.log('Multiple values set as JSON:', JSON.stringify(values));
      }
    }
    
    console.log('\n=== FINAL ROW VALUES ===');
    console.log('Non-empty values:', rowValues.filter((v, i) => v && v.trim()).map((v, i) => `Col ${i+1}: ${v}`));
    
    return rowValues;
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Debug function to test XML parsing
 */
export async function debugXmlParsing(xmlContent: string): Promise<void> {
  try {
    console.log('=== DEBUG XML PARSING ===');
    const root = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false,
      charkey: '_'
    });
    
    console.log('Full XML structure:');
    console.log(JSON.stringify(root, null, 2));
    
    // Test specific paths
    const testPaths = [
      ['FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente', 'IdPaese'],
      ['FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente', 'IdCodice'],
      ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'Anagrafica', 'Denominazione']
    ];
    
    for (const path of testPaths) {
      console.log(`\n--- Testing path: [${path.join(' -> ')}] ---`);
      const nodes = navigateXmlPath(root, path);
      const values = extractTextValues(nodes);
      console.log(`Result: ${values.length} values found: [${values.join(', ')}]`);
    }
  } catch (error) {
    console.error('Debug parsing error:', error);
  }
}

/**
 * Process a single XML file and extract data for Excel
 */
export async function processXmlToExcel(
  xmlContent: string,
  mappingExcel: ArrayBuffer | Uint8Array | Buffer
): Promise<XmlProcessingResult> {
  try {
    // Debug XML parsing first
    await debugXmlParsing(xmlContent);
    
    // Load the mapping Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(mappingExcel as any);
    const worksheet = workbook.worksheets[0];
    
    // Build mappings
    const idToTag = buildIdToTagMapFromSameSheet(worksheet);
    const idToPath = buildIdToPath(idToTag);
    const leafIds = extractLeafIds(worksheet);
    const maxCol = (worksheet as any).actualColumnCount ?? worksheet.columnCount;
    
    // Parse XML values
    const rowValues = await parseXmlValues(xmlContent, idToPath, leafIds, maxCol);
    
    return {
      rowValues,
      success: true
    };
  } catch (error) {
    return {
      rowValues: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Batch process multiple XML files
 */
export async function batchProcessXmlFiles(
  xmlFiles: XmlFile[],
  mappingExcel: ArrayBuffer | Uint8Array | Buffer
): Promise<BatchProcessingResult> {
  const results: BatchProcessingResult = {};
  
  for (const xmlFile of xmlFiles) {
    console.log(`Processing ${xmlFile.name}...`);
    results[xmlFile.name] = await processXmlToExcel(xmlFile.content, mappingExcel);
  }
  
  return results;
}

/**
 * Generate Excel file with extracted XML data
 */
export async function generateExcelFromXmlData(
  xmlResults: { [filename: string]: XmlProcessingResult },
  mappingExcel: ArrayBuffer | Uint8Array | Buffer
): Promise<Buffer> {
  // Load the mapping Excel file to get the structure
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(mappingExcel as any);
  const worksheet = workbook.worksheets[0];
  
  // Get the column structure from the mapping
  const leafIds = extractLeafIds(worksheet);
  const maxCol = (worksheet as any).actualColumnCount ?? worksheet.columnCount;
  
  // Create a new workbook for the output
  const outputWorkbook = new ExcelJS.Workbook();
  const outputWorksheet = outputWorkbook.addWorksheet('XML Data');
  
  // Add headers (column names from the mapping)
  const headers: string[] = [];
  for (let col = 1; col <= maxCol; col++) {
    const idCode = leafIds[col];
    if (idCode) {
      headers.push(`Column ${col} (ID: ${idCode})`);
    } else {
      headers.push(`Column ${col}`);
    }
  }
  outputWorksheet.addRow(headers);
  
  // Style the header row
  const headerRow = outputWorksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data rows
  for (const [filename, result] of Object.entries(xmlResults)) {
    if (result.success) {
      // Create a row with filename and data
      const rowData = [filename, ...result.rowValues];
      outputWorksheet.addRow(rowData);
    } else {
      // Add error row
      const errorRow = [filename, `ERROR: ${result.error}`, ...new Array(maxCol - 1).fill('')];
      outputWorksheet.addRow(errorRow);
      
      // Style error row
      const rowIndex = outputWorksheet.rowCount;
      const errorRowObj = outputWorksheet.getRow(rowIndex);
      errorRowObj.font = { color: { argb: 'FFFF0000' } };
    }
  }
  
  // Auto-fit columns
  outputWorksheet.columns.forEach(column => {
    column.width = Math.max(column.width || 10, 15);
  });
  
  // Generate buffer
  const buffer = await outputWorkbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate Excel file from single XML processing result
 */
export async function generateSingleXmlExcel(
  filename: string,
  result: XmlProcessingResult,
  mappingExcel: ArrayBuffer | Uint8Array | Buffer
): Promise<Buffer> {
  return generateExcelFromXmlData({ [filename]: result }, mappingExcel);
}
