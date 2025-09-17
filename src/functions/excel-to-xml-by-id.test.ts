/*
  xml-to-excel-by-id (Next.js/browser-friendly TS port) — ExcelJS version

  Cambios vs la versión SheetJS:
  - Reescrito con exceljs (browser build) para leer/escribir XLSX en el cliente.
  - Misma API pública (xmlToExcelById) para minimizar cambios aguas arriba.

  Dependencias
  ------------
  npm i exceljs

  Sugerencia Next.js (evitar SSR):
  - Este módulo está preparado para lazy import interno de exceljs.
  - Si lo usás en un componente cliente, simplemente importalo normal.

  Uso mínimo
  ----------
  import { xmlToExcelById } from "@/lib/xml-to-excel-by-id.exceljs";

  const res = await xmlToExcelById({
    xmlFiles,
    representationXlsx: await reprFile.arrayBuffer(),
    mappingXlsx: await mappingFile.arrayBuffer(),
    excelOut: outFile ? await outFile.arrayBuffer() : undefined,
  });

  const url = URL.createObjectURL(new Blob([res.xlsxArrayBuffer]));
  const a = document.createElement('a');
  a.href = url; a.download = 'hierarchical_mapping_populated_json.xlsx'; a.click();
  URL.revokeObjectURL(url);
*/

import type ExcelJSNamespace from 'exceljs';
let ExcelJS: typeof ExcelJSNamespace | null = null;

// Lazy import para evitar problemas con SSR de Next.js
async function getExcelJS() {
  if (!ExcelJS) {
    const mod: any = await import('exceljs');
    ExcelJS = mod.default ?? mod; // algunas bundlers exponen default
  }
  return ExcelJS as unknown as typeof ExcelJSNamespace;
}

export type BinaryLike = ArrayBuffer | Uint8Array;

export interface XmlToExcelByIdOptions {
  xmlFiles: (File | Blob | string | BinaryLike)[];
  representationXlsx: BinaryLike | File | Blob;
  mappingXlsx: BinaryLike | File | Blob;
  excelOut?: BinaryLike | File | Blob;
  representationSheetName?: string;
  mappingSheetName?: string;
  outputSheetName?: string;
}

export interface ExcelResult {
  workbook: ExcelJSNamespace.Workbook;
  sheetName: string;
  xlsxArrayBuffer: ArrayBuffer;
  appended: number;
}

// ------------------ helpers ------------------
async function toArrayBuffer(src: File | Blob | string | BinaryLike): Promise<ArrayBuffer> {
  if (src instanceof ArrayBuffer) return src;
  if (src instanceof Uint8Array) return src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength);
  if (typeof src === 'string') return new TextEncoder().encode(src).buffer;
  return await (src as Blob).arrayBuffer();
}

async function readWorkbook(data: BinaryLike | File | Blob): Promise<ExcelJSNamespace.Workbook> {
  const Excel = await getExcelJS();
  const wb = new Excel.Workbook();
  const ab = await toArrayBuffer(data as any);
  await wb.xlsx.load(ab);
  return wb;
}

function firstSheetName(wb: ExcelJSNamespace.Workbook): string {
  if (wb.worksheets.length === 0) throw new Error('Workbook sin hojas');
  return wb.worksheets[0].name;
}

function getSheet(wb: ExcelJSNamespace.Workbook, name?: string): ExcelJSNamespace.Worksheet {
  const sheetName = name ?? firstSheetName(wb);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error("Hoja '" + sheetName + "' no encontrada");
  return ws;
}

function cellString(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && (v as any).richText) {
    return (v as any).richText.map((t: any) => t.text).join('');
  }
  if (typeof v === 'object' && (v as any).text) return String((v as any).text);
  return null;
}

// ------------------ 1) ID -> Tag desde representación ------------------
const ID_TAG_RE = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/;

export function buildIdToTagMapFromSheet(ws: ExcelJSNamespace.Worksheet): Map<string, string> {
  const idToTag = new Map<string, string>();
  const maxR: number = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC: number = (ws as any).actualColumnCount ?? ws.columnCount;

  // Buscar fila que contiene "ID e Nome" en la primera columna
  let headerRow = -1;
  for (let r = 1; r <= maxR; r++) {
    const v = cellString(ws.getRow(r).getCell(1).value);
    if (v && /ID\s*e\s*Nome/i.test(v)) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) throw new Error("No se encontró el encabezado 'ID e Nome'");

  for (let r = headerRow + 1; r <= maxR; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= maxC; c++) {
      const txt = cellString(row.getCell(c).value);
      if (!txt) continue;
      if (txt.indexOf('<') >= 0) {
        const m = txt.match(ID_TAG_RE);
        if (m) {
          idToTag.set(m[1], m[2]);
          break;
        }
      }
    }
  }
  return idToTag;
}

export function buildIdToPath(idToTag: Map<string, string>): Map<string, string[]> {
  const idToPath = new Map<string, string[]>();
  for (const id of idToTag.keys()) {
    const parts = id.split('.');
    const path: string[] = [];
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      const t = idToTag.get(prefix);
      if (t) path.push(t);
    }
    idToPath.set(id, path);
  }
  return idToPath;
}

// ------------------ 2) Leaf IDs por columna desde mapping ------------------
const LEAF_ID_RE = /^(\d+(?:\.\d+)*)\s*</;

export function extractLeafIds(ws: ExcelJSNamespace.Worksheet): { colToId: Map<number, string>; maxCol: number } {
  const maxR: number = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC: number = (ws as any).actualColumnCount ?? ws.columnCount;
  const colToId = new Map<number, string>();
  for (let c = 1; c <= maxC; c++) {
    let found: string | null = null;
    for (let r = maxR; r >= 1; r--) {
      const txt = cellString(ws.getRow(r).getCell(c).value);
      if (!txt) continue;
      if (txt.indexOf('<') >= 0) {
        const m = txt.match(LEAF_ID_RE);
        if (m) {
          found = m[1];
          break;
        }
      }
    }
    if (found) colToId.set(c - 1, found); // índice 0-based para columnas
  }
  return { colToId, maxCol: maxC };
}

// ------------------ 3) Parsear 1 XML a una fila ------------------
function parseXml(text: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) throw new Error('XML inválido');
  return doc;
}
function nsLocalName(el: Element): string {
  return el.localName || el.tagName.replace(/^.*:/, '');
}

export function parseXmlValues(
  xmlDoc: Document,
  idToPath: Map<string, string[]>,
  leafIds: Map<number, string>,
  maxCol: number
): string[] {
  const root = xmlDoc.documentElement;
  const rowValues: string[] = Array.from({ length: maxCol }, () => '');

  for (const [colIdx, idCode] of leafIds.entries()) {
    const path = idToPath.get(idCode);
    if (!path || path.length === 0) continue;

    let nodes: Element[] = [root];
    for (const tag of path) {
      const next: Element[] = [];
      for (const n of nodes) {
        for (let i = 0; i < n.children.length; i++) {
          const ch = n.children[i] as Element;
          if (nsLocalName(ch) === tag) next.push(ch);
        }
      }
      nodes = next;
      if (nodes.length === 0) break;
    }

    const vals: string[] = [];
    for (const n of nodes) {
      const t = n.textContent ? n.textContent.trim() : '';
      if (t) vals.push(t);
    }

    if (vals.length === 0) rowValues[colIdx] = '';
    else if (vals.length === 1) rowValues[colIdx] = vals[0];
    else rowValues[colIdx] = JSON.stringify(vals);
  }

  return rowValues;
}

// ------------------ 4) Asegurar hoja de salida y agregar filas ------------------
function ensureOutputSheet(
  wb: ExcelJSNamespace.Workbook,
  sheetName?: string
): { ws: ExcelJSNamespace.Worksheet; name: string } {
  const name = sheetName ?? (wb.worksheets[0] ? wb.worksheets[0].name : 'Sheet1');
  let ws = wb.getWorksheet(name);
  if (!ws) ws = wb.addWorksheet(name);
  return { ws, name };
}

// ------------------ 5) Orquestador ------------------
export async function xmlToExcelById(options: XmlToExcelByIdOptions): Promise<ExcelResult> {
  const repWb = await readWorkbook(options.representationXlsx);
  const mapWb = await readWorkbook(options.mappingXlsx);
  const Excel = await getExcelJS();
  const outWb = options.excelOut ? await readWorkbook(options.excelOut) : new Excel.Workbook();

  const repWs = getSheet(repWb, options.representationSheetName);
  const mapWs = getSheet(mapWb, options.mappingSheetName);
  const outMeta = ensureOutputSheet(outWb, options.outputSheetName);

  const idToTag = buildIdToTagMapFromSheet(repWs);
  const idToPath = buildIdToPath(idToTag);
  const leaf = extractLeafIds(mapWs);

  let appended = 0;
  for (const src of options.xmlFiles) {
    const buf = await toArrayBuffer(src as any);
    const xmlText = new TextDecoder().decode(new Uint8Array(buf));
    const doc = parseXml(xmlText);
    const row = parseXmlValues(doc, idToPath, leaf.colToId, leaf.maxCol);
    outMeta.ws.addRow(row);
    appended++;
  }

  const xlsxArrayBuffer = await outWb.xlsx.writeBuffer();
  return { workbook: outWb, sheetName: outMeta.name, xlsxArrayBuffer: xlsxArrayBuffer as ArrayBuffer, appended };
}

// Helpers opcionales
export async function buildIdMaps(representationXlsx: BinaryLike | File | Blob) {
  const wb = await readWorkbook(representationXlsx);
  const ws = getSheet(wb);
  const idToTag = buildIdToTagMapFromSheet(ws);
  const idToPath = buildIdToPath(idToTag);
  return { idToTag, idToPath };
}

export async function discoverLeafIds(mappingXlsx: BinaryLike | File | Blob) {
  const wb = await readWorkbook(mappingXlsx);
  const ws = getSheet(wb);
  return extractLeafIds(ws);
}
