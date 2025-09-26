// lib/excelToXml.single.ts
import ExcelJS from 'exceljs';
import { create } from 'xmlbuilder';
import { Buffer as NodeBuffer } from 'node:buffer';

type GenMode = 'xsd' | 'portal';
interface XmlOpts {
  mode?: GenMode; // 'xsd' (default) | 'portal'
  includeXmlDecl?: boolean; // true => <?xml version="1.0" encoding="utf-8"?>
}

// ---------- util binario para exceljs (Node) ----------
function toNodeBuffer(src: ArrayBuffer | Uint8Array | NodeBuffer): NodeBuffer {
  if (NodeBuffer.isBuffer(src)) return src;
  if (src instanceof Uint8Array) return NodeBuffer.from(src.buffer, src.byteOffset, src.byteLength);
  return NodeBuffer.from(src as ArrayBuffer);
}

// ---------- validaciones / normalizadores ----------
const VALID_RF = new Set([
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
const VALID_TD = new Set([
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

function first(valuesById: Map<string, string[]>, id: string): string | undefined {
  const v = valuesById.get(id);
  if (!v || !v.length) return undefined;
  const s = (v[0] ?? '').toString().trim();
  return s || undefined;
}
function assertPresent(valuesById: Map<string, string[]>, id: string, tag: string, errs: string[]) {
  if (!first(valuesById, id)) errs.push(`Falta ${tag} (ID ${id})`);
}
function normUpper2(s: string): string {
  return (s || '').toString().trim().toUpperCase();
}
function normUpper3(s: string): string {
  return (s || '').toString().trim().toUpperCase();
}
function normCap5(s: string): string {
  const onlyDigits = (s || '').toString().replace(/\D+/g, '');
  if (onlyDigits.length === 0) return '';
  return onlyDigits.padStart(5, '0').slice(-5);
}

// ---------- regex y helpers ----------
const ID_TAG_RE = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/; // "N.N <Tag>"
const ID_ONLY_LOOSE_RE = /^\s*(\d+(?:\.\d+)*)\b/; // "N.N" (sin <Tag>)

function cellStr(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'object') {
    if ((v as any).text) return String((v as any).text);
    if ((v as any).result !== undefined) return String((v as any).result);
    if ((v as Date) instanceof Date) return (v as Date).toISOString().slice(0, 10);
    try {
      return String(v);
    } catch {
      return null;
    }
  }
  const s = String(v);
  return s.length ? s : null;
}
function parseMaybeJsonArray(value: any): string[] {
  const s = cellStr(value);
  if (!s || !s.trim()) return [];
  const t = s.trim();
  if (t.startsWith('[')) {
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p)) return p.map(String);
    } catch {}
  }
  return [s];
}
function findChildByTag(node: any, tag: string): any | null {
  const kids = (node as any).children as any[] | undefined;
  if (!kids) return null;
  for (const ch of kids) if (ch?.name === tag) return ch;
  return null;
}
function ensurePath(root: any, tags: string[]) {
  let cur = root;
  for (const t of tags) {
    let child = findChildByTag(cur, t);
    if (!child) child = (cur as any).ele(t);
    cur = child;
  }
  return cur;
}
function endsNoNs(tag: string, name: string) {
  return tag === name || tag.endsWith(name);
}

// ---------- secciones / grupos ----------
const TOP_SECTION_FOR: Record<string, string[]> = {
  '1': ['FatturaElettronicaHeader'],
  '2': ['FatturaElettronicaBody'],
  '2.1': ['FatturaElettronicaBody', 'DatiGenerali'],
  '2.2': ['FatturaElettronicaBody', 'DatiBeniServizi'],
  '2.3': ['FatturaElettronicaBody', 'DatiVeicoli'],
  '2.4': ['FatturaElettronicaBody', 'DatiPagamento'],
  '2.5': ['FatturaElettronicaBody', 'Allegati'],
};
const GROUP_TAG_FOR_PREFIX: Record<string, string> = {
  '2.1.2': 'DatiOrdineAcquisto',
  '2.2.1': 'DatiRiepilogo',
  '2.2.2': 'DettaglioLinee',
  '2.4.2': 'DettaglioPagamento',
};

// ---------- rutas XSD conocidas (mínimas pero claves) ----------
const XSD_KNOWN_PATHS: Record<string, string[]> = {
  // Header -> DatiTrasmissione
  '1.1': ['FatturaElettronicaHeader', 'DatiTrasmissione'],
  '1.1.1': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente'],
  '1.1.1.1': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente', 'IdPaese'],
  '1.1.1.2': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'IdTrasmittente', 'IdCodice'],
  '1.1.2': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'ProgressivoInvio'],
  '1.1.3': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'FormatoTrasmissione'],
  '1.1.4': ['FatturaElettronicaHeader', 'DatiTrasmissione', 'CodiceDestinatario'],

  // CedentePrestatore
  '1.2': ['FatturaElettronicaHeader', 'CedentePrestatore'],
  '1.2.1': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici'],
  '1.2.1.1': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'IdFiscaleIVA'],
  '1.2.1.1.1': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'IdFiscaleIVA', 'IdPaese'],
  '1.2.1.1.2': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'IdFiscaleIVA', 'IdCodice'],
  '1.2.1.3': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'Anagrafica'],
  '1.2.1.3.1': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'Anagrafica', 'Denominazione'],
  '1.2.1.6': ['FatturaElettronicaHeader', 'CedentePrestatore', 'DatiAnagrafici', 'RegimeFiscale'],
  '1.2.2': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede'],
  '1.2.2.4': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'Indirizzo'],
  '1.2.2.5': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'NumeroCivico'],
  '1.2.2.6': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'CAP'],
  '1.2.2.7': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'Comune'],
  '1.2.2.9': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'Provincia'],
  '1.2.2.10': ['FatturaElettronicaHeader', 'CedentePrestatore', 'Sede', 'Nazione'],

  // CessionarioCommittente
  '1.4': ['FatturaElettronicaHeader', 'CessionarioCommittente'],
  '1.4.1': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici'],
  '1.4.1.1': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'IdFiscaleIVA'],
  '1.4.1.1.1': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'IdFiscaleIVA', 'IdPaese'],
  '1.4.1.1.2': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'IdFiscaleIVA', 'IdCodice'],
  '1.4.1.2': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'CodiceFiscale'],
  '1.4.1.3': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'Anagrafica'],
  '1.4.1.3.1': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'DatiAnagrafici', 'Anagrafica', 'Denominazione'],
  '1.4.2': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede'],
  '1.4.2.4': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'Indirizzo'],
  '1.4.2.5': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'NumeroCivico'],
  '1.4.2.6': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'CAP'],
  '1.4.2.7': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'Comune'],
  '1.4.2.8': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'Provincia'],
  '1.4.2.9': ['FatturaElettronicaHeader', 'CessionarioCommittente', 'Sede', 'Nazione'],
  '1.6': ['FatturaElettronicaHeader', 'SoggettoEmittente'],

  // Body
  '2.1': ['FatturaElettronicaBody', 'DatiGenerali'],
  '2.1.1': ['FatturaElettronicaBody', 'DatiGenerali', 'DatiGeneraliDocumento'],
  '2.1.2': ['FatturaElettronicaBody', 'DatiGenerali', 'DatiOrdineAcquisto'],
  '2.2': ['FatturaElettronicaBody', 'DatiBeniServizi'],
  '2.2.2': ['FatturaElettronicaBody', 'DatiBeniServizi', 'DettaglioLinee'],
  '2.2.1': ['FatturaElettronicaBody', 'DatiBeniServizi', 'DatiRiepilogo'],
  '2.4': ['FatturaElettronicaBody', 'DatiPagamento'],
  '2.4.2': ['FatturaElettronicaBody', 'DatiPagamento', 'DettaglioPagamento'],
};

// ---------- fallbacks ----------
function fallbackTopPathFor(idOrPref: string): string[] {
  const parts = idOrPref.split('.');
  for (let i = parts.length; i >= 1; i--) {
    const pref = parts.slice(0, i).join('.');
    if (TOP_SECTION_FOR[pref]) return TOP_SECTION_FOR[pref];
  }
  return idOrPref.startsWith('1') ? TOP_SECTION_FOR['1'] : idOrPref.startsWith('2') ? TOP_SECTION_FOR['2'] : [];
}
function fallbackGroupTagFor(pref: string): string | null {
  const parts = pref.split('.');
  for (let i = parts.length; i >= 1; i--) {
    const p = parts.slice(0, i).join('.');
    if (GROUP_TAG_FOR_PREFIX[p]) return GROUP_TAG_FOR_PREFIX[p];
  }
  return null;
}

// ---------- 1) ID->Tag ----------
function buildIdToTagMapFromSameSheet(ws: ExcelJS.Worksheet): Map<string, string> {
  const idToTag = new Map<string, string>();
  const maxR = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC = (ws as any).actualColumnCount ?? ws.columnCount;

  // fila "ID e Nome" en col 1
  let headerRow = -1;
  for (let r = 1; r <= maxR; r++) {
    const v = cellStr(ws.getRow(r).getCell(1).value);
    if (v && /ID\s*e\s*Nome/i.test(v)) {
      headerRow = r;
      break;
    }
  }

  if (headerRow > 0) {
    for (let r = headerRow + 1; r <= maxR; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= maxC; c++) {
        const txt = cellStr(row.getCell(c).value);
        if (!txt) continue;
        const m = txt.match(ID_TAG_RE);
        if (m) {
          idToTag.set(m[1], m[2]);
          break;
        }
      }
    }
    if (idToTag.size) return idToTag;
  }

  // fallback: primeras 10 filas
  const TOP = Math.min(10, maxR);
  for (let r = 1; r <= TOP; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= maxC; c++) {
      const txt = cellStr(row.getCell(c).value);
      if (!txt) continue;
      const m = txt.match(ID_TAG_RE);
      if (m) idToTag.set(m[1], m[2]);
    }
  }

  if (!idToTag.size) throw new Error(`No pude construir ID->Tag desde la misma hoja`);
  return idToTag;
}

// ---------- 1b) ID->Path con fallback XSD (y por prefijo) ----------
function buildIdToPath(idToTag: Map<string, string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of idToTag.keys()) {
    // ruta XSD conocida
    if (XSD_KNOWN_PATHS[id]) {
      map.set(id, XSD_KNOWN_PATHS[id]);
      continue;
    }
    // construir desde hoja
    const parts = id.split('.');
    const fromSheet: string[] = [];
    for (let i = 1; i <= parts.length; i++) {
      const pref = parts.slice(0, i).join('.');
      const t = idToTag.get(pref);
      if (t) fromSheet.push(t);
    }
    if (fromSheet.length) {
      map.set(id, fromSheet);
      continue;
    }

    // fallback por prefijo XSD
    for (let i = parts.length - 1; i >= 1; i--) {
      const pref = parts.slice(0, i).join('.');
      if (XSD_KNOWN_PATHS[pref]) {
        const leaf = idToTag.get(id);
        map.set(id, leaf ? [...XSD_KNOWN_PATHS[pref], leaf] : XSD_KNOWN_PATHS[pref]);
        continue;
      }
    }

    // último recurso
    const top = fallbackTopPathFor(id);
    const leaf = idToTag.get(id);
    map.set(id, leaf ? [...top, leaf] : top);
  }
  return map;
}

// ---------- 2) Leaf IDs (robusto) ----------
function extractLeafIdsFromSameSheet(ws: ExcelJS.Worksheet): Map<number, string> {
  const maxR = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC = (ws as any).actualColumnCount ?? ws.columnCount;

  const colToId = new Map<number, string>();
  for (let c = 1; c <= maxC; c++) {
    let found: string | null = null;

    // buscar de abajo
    for (let r = maxR; r >= 1; r--) {
      const txt = cellStr(ws.getRow(r).getCell(c).value);
      if (!txt) continue;
      const m = txt.match(ID_ONLY_LOOSE_RE);
      if (m) {
        found = m[1];
        break;
      }
    }
    // si no, primeras filas
    if (!found) {
      const TOP = Math.min(15, maxR);
      for (let r = 1; r <= TOP; r++) {
        const txt = cellStr(ws.getRow(r).getCell(c).value);
        if (!txt) continue;
        const m = txt.match(ID_ONLY_LOOSE_RE);
        if (m) {
          found = m[1];
          break;
        }
      }
    }

    if (found) colToId.set(c, found);
  }

  if (!colToId.size) throw new Error(`No se detectaron IDs hoja al pie/encabezado de columnas`);
  return colToId;
}

// ---------- util de reorden ----------
function reorderChildren(node: any, order: string[]) {
  const kids: any[] = ((node as any).children as any[]) ?? [];
  if (!kids.length) return;
  const score = (n: any) => {
    const name = n?.name ?? '';
    const idx = order.indexOf(name);
    return idx === -1 ? 1000 : idx;
  };
  const withIndex = kids.map((k, i) => ({ k, i }));
  withIndex.sort((a, b) => {
    const da = score(a.k),
      db = score(b.k);
    if (da !== db) return da - db;
    return a.i - b.i;
  });
  (node as any).children = withIndex.map((x) => x.k);
}

// ---------- 3) Construir 1 XML por fila ----------
function processRow(values: any[], leafIds: Map<number, string>, idToPath: Map<string, string[]>, opts: XmlOpts) {
  const { mode = 'xsd', includeXmlDecl = true } = opts ?? {};

  // xmlbuilder clásico → crear root directamente
  const root: any = includeXmlDecl
    ? create('FatturaElettronica', { version: '1.0', encoding: 'utf-8' })
    : create('FatturaElettronica');

  // contenedores top
  ensurePath(root, ['FatturaElettronicaHeader']);
  ensurePath(root, ['FatturaElettronicaBody']);

  // map ID -> lista de valores
  const valuesById = new Map<string, string[]>();
  for (const [colIdx, idCode] of leafIds) {
    const i = colIdx - 1;
    if (i < 0 || i >= values.length) continue;
    const items = parseMaybeJsonArray(values[i]);
    if (items.length) valuesById.set(idCode, items);
  }

  // ====== VALIDACIÓN MÍNIMA ======
  const errs: string[] = [];

  // Header / DatiTrasmissione
  assertPresent(valuesById, '1.1.1.1', 'DatiTrasmissione/IdTrasmittente/IdPaese', errs);
  assertPresent(valuesById, '1.1.1.2', 'DatiTrasmissione/IdTrasmittente/IdCodice', errs);
  assertPresent(valuesById, '1.1.2', 'DatiTrasmissione/ProgressivoInvio', errs);

  // CedentePrestatore
  assertPresent(valuesById, '1.2.1.6', 'CedentePrestatore/DatiAnagrafici/RegimeFiscale', errs);
  assertPresent(valuesById, '1.2.2.6', 'CedentePrestatore/Sede/CAP', errs);
  assertPresent(valuesById, '1.2.2.7', 'CedentePrestatore/Sede/Comune', errs);
  assertPresent(valuesById, '1.2.2.10', 'CedentePrestatore/Sede/Nazione', errs);

  // CessionarioCommittente
  assertPresent(valuesById, '1.4.2.6', 'CessionarioCommittente/Sede/CAP', errs);
  assertPresent(valuesById, '1.4.2.7', 'CessionarioCommittente/Sede/Comune', errs);
  assertPresent(valuesById, '1.4.2.9', 'CessionarioCommittente/Sede/Nazione', errs);
  const hasCF = !!first(valuesById, '1.4.1.2');
  const hasIvaPaese = !!first(valuesById, '1.4.1.1.1');
  const hasIvaCodice = !!first(valuesById, '1.4.1.1.2');
  if (!(hasCF || (hasIvaPaese && hasIvaCodice))) {
    errs.push('Cessionario: debe existir CodiceFiscale (1.4.1.2) o IdFiscaleIVA (1.4.1.1.1 + 1.4.1.1.2)');
  }

  // DatiGeneraliDocumento
  assertPresent(valuesById, '2.1.1.1', 'DatiGeneraliDocumento/TipoDocumento', errs);
  assertPresent(valuesById, '2.1.1.2', 'DatiGeneraliDocumento/Divisa', errs);
  assertPresent(valuesById, '2.1.1.4', 'DatiGeneraliDocumento/Numero', errs);

  // DatiBeniServizi
  const anyLinea = [...valuesById.keys()].some((k) => k.startsWith('2.2.2.'));
  const anyRiep = [...valuesById.keys()].some((k) => k.startsWith('2.2.1.'));
  if (!anyLinea) errs.push('DatiBeniServizi/DettaglioLinee es obligatorio (faltan 2.2.2.*)');
  if (!anyRiep) errs.push('DatiBeniServizi/DatiRiepilogo es obligatorio (faltan 2.2.1.*)');

  // DatiPagamento
  const anyPag = [...valuesById.keys()].some((k) => k.startsWith('2.4.2.'));
  if (!anyPag) errs.push('DatiPagamento/DettaglioPagamento es obligatorio (faltan 2.4.2.*)');

  // Normalizaciones/formatos
  const cedCAP = first(valuesById, '1.2.2.6');
  const cedNaz = first(valuesById, '1.2.2.10');
  if (cedCAP) {
    const z = normCap5(cedCAP);
    if (z.length !== 5) errs.push(`Cedente/Sede/CAP inválido: "${cedCAP}" (5 dígitos)`);
  }
  if (cedNaz && !/^[A-Z]{2}$/.test(normUpper2(cedNaz))) errs.push(`Cedente/Sede/Nazione inválida: "${cedNaz}" (ISO2)`);

  const cesCAP = first(valuesById, '1.4.2.6');
  const cesNaz = first(valuesById, '1.4.2.9');
  if (cesCAP) {
    const z = normCap5(cesCAP);
    if (z.length !== 5) errs.push(`Cessionario/Sede/CAP inválido: "${cesCAP}" (5 dígitos)`);
  }
  if (cesNaz && !/^[A-Z]{2}$/.test(normUpper2(cesNaz)))
    errs.push(`Cessionario/Sede/Nazione inválida: "${cesNaz}" (ISO2)`);

  const td = first(valuesById, '2.1.1.1');
  if (td && !VALID_TD.has(td.toUpperCase())) errs.push(`TipoDocumento inválido: "${td}"`);
  const cur = first(valuesById, '2.1.1.2');
  if (cur && !/^[A-Z]{3}$/.test(normUpper3(cur))) errs.push(`Divisa inválida: "${cur}" (ISO 4217)`);
  const rf = first(valuesById, '1.2.1.6');
  if (rf && !VALID_RF.has(rf.toUpperCase())) errs.push(`RegimeFiscale inválido: "${rf}"`);

  const idPaeseTx = first(valuesById, '1.1.1.1');
  const idCodTx = first(valuesById, '1.1.1.2');
  const progInvio = first(valuesById, '1.1.2');
  if (idPaeseTx && !/^[A-Z]{2}$/.test(normUpper2(idPaeseTx)))
    errs.push(`IdTrasmittente/IdPaese inválido: "${idPaeseTx}"`);
  if (idCodTx && !/^[0-9A-Za-z._-]+$/.test(idCodTx)) errs.push(`IdTrasmittente/IdCodice inválido: "${idCodTx}"`);
  if (progInvio && !/^[0-9A-Za-z]+$/.test(progInvio))
    errs.push(`ProgressivoInvio inválido: "${progInvio}" (alfanumérico)`);

  if (errs.length) {
    throw new Error('Errores de datos obligatorios/formatos:\n- ' + errs.join('\n- '));
  }

  // --- DatiOrdineAcquisto (2.1.2.*) ---
  const processed = new Set<string>();
  const datiOrdineIds = [...valuesById.keys()].filter((id) => id.startsWith('2.1.2.'));
  if (datiOrdineIds.length) {
    const rifId = '2.1.2.1';
    const docId = '2.1.2.2';
    if (valuesById.has(rifId) && valuesById.has(docId)) {
      const rifVals = valuesById.get(rifId)!;
      const docVals = valuesById.get(docId)!;
      const generaliPath = idToPath.get('2.1') ?? fallbackTopPathFor('2.1');
      if (generaliPath?.length) {
        const generali = ensurePath(root, generaliPath);
        const map = new Map<string, string[]>();

        if (rifVals.length === docVals.length) {
          rifVals.forEach((rif, i) => {
            const d = String(docVals[i]);
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(String(rif));
          });
        } else if (rifVals.length > docVals.length && docVals.length >= 1) {
          if (docVals.length >= 2) {
            map.set(String(docVals[0]), [String(rifVals[0])]);
            map.set(String(docVals[1]), rifVals.slice(1).map(String));
          } else {
            map.set(String(docVals[0]), rifVals.map(String));
          }
        } else {
          for (let i = 0; i < Math.min(rifVals.length, docVals.length); i++) {
            const d = String(docVals[i]);
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(String(rifVals[i]));
          }
        }

        for (const [docNum, rifList] of map) {
          const nodo: any = generali.ele('DatiOrdineAcquisto');
          rifList.forEach((r) => nodo.ele('RiferimentoNumeroLinea').txt(String(r).replace(/\n/g, ' ').trim()));
          nodo.ele('IdDocumento').txt(String(docNum).replace(/\n/g, ' ').trim());
          for (const id of datiOrdineIds) {
            if (id === rifId || id === docId) continue;
            const vals = valuesById.get(id);
            if (!vals?.length) continue;
            const p = idToPath.get(id) ?? [];
            const tag = p.length ? p[p.length - 1] : id.split('.').pop()!;
            nodo.ele(tag).txt(String(vals[0]).replace(/\n/g, ' ').trim());
          }
        }
        datiOrdineIds.forEach((id) => processed.add(id));
      }
    }
  }

  // --- grupos repetidos ---
  const groups = new Map<string, string[]>();
  for (const id of valuesById.keys()) {
    if (processed.has(id)) continue;
    const parts = id.split('.');
    const pref = parts.length > 1 ? parts.slice(0, -1).join('.') : id;
    if (!groups.has(pref)) groups.set(pref, []);
    groups.get(pref)!.push(id);
  }

  const numCmp = (a: string, b: string) => {
    const aa = a.split('.').map(Number);
    const bb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const d = (aa[i] ?? 0) - (bb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  };

  for (const [pref, ids] of groups) {
    const maxLen = Math.max(...ids.map((id) => valuesById.get(id)!.length));
    if (maxLen > 1 && pref.split('.').length > 0) {
      let groupPath = idToPath.get(pref);
      if (!groupPath || groupPath.length === 0) {
        const sample = idToPath.get(ids[0]);
        if (sample && sample.length > 1) groupPath = sample.slice(0, -1);
      }
      let groupTag = groupPath && groupPath.length ? groupPath[groupPath.length - 1] : null;
      if (!groupTag) groupTag = fallbackGroupTagFor(pref);
      if (!groupTag) continue;

      let parentPath = groupPath ? groupPath.slice(0, -1) : [];
      if (!parentPath.length) parentPath = fallbackTopPathFor(pref);

      const sorted = [...ids].sort(numCmp);
      for (let i = 0; i < maxLen; i++) {
        const parent = ensurePath(root, parentPath);
        const group = (parent as any).ele(groupTag) as any;
        for (const idC of sorted) {
          const list = valuesById.get(idC)!;
          if (i >= list.length) continue;
          const val = list[i];
          if (val == null || !String(val).trim()) continue;
          const leafPath = idToPath.get(idC);
          if (!leafPath || leafPath.length === 0) continue;
          const leafTag = leafPath[leafPath.length - 1];
          group.ele(leafTag).txt(String(val).replace(/\n/g, ' ').trim());
        }
      }
      ids.forEach((id) => processed.add(id));
    }
  }

  // --- singles ---
  for (const [id, items] of valuesById) {
    if (processed.has(id)) continue;
    const pathTags = idToPath.get(id);
    if (!pathTags?.length) continue;
    let parentPath = pathTags.slice(0, -1);
    if (!parentPath.length) parentPath = fallbackTopPathFor(id);
    const leaf = pathTags[pathTags.length - 1];
    const parent = ensurePath(root, parentPath);
    for (const v of items) {
      if (v == null || !String(v).trim()) continue;
      (parent as any).ele(leaf).txt(String(v).replace(/\n/g, ' ').trim());
    }
  }

  // ---------- atributos raíz ----------
  root.att('xmlns', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');
  root.att('versione', 'FPR12');

  // ---------- detectar header/body ----------
  let header: any = null,
    body: any = null;
  const kids = ((root as any).children as any[]) ?? [];
  for (const ch of kids) {
    if (ch?.name && endsNoNs(ch.name, 'FatturaElettronicaHeader')) header = ch;
    if (ch?.name && endsNoNs(ch.name, 'FatturaElettronicaBody')) body = ch;
  }

  // ---------- modo 'portal' vs 'xsd' ----------
  if (mode === 'portal') {
    if (header) (header as any).att('xmlns', '');
    if (body) (body as any).att('xmlns', '');
  }

  // ---------- ordenar ----------
  reorderChildren(root, ['FatturaElettronicaHeader', 'FatturaElettronicaBody', 'ds:Signature']);
  if (header) {
    reorderChildren(header, [
      'DatiTrasmissione',
      'CedentePrestatore',
      'RappresentanteFiscale',
      'CessionarioCommittente',
      'TerzoIntermediarioOSoggettoEmittente',
      'SoggettoEmittente',
    ]);
  }
  if (body) {
    // DatiGeneraliDocumento primero dentro de DatiGenerali
    const dg = findChildByTag(body, 'DatiGenerali');
    if (dg) {
      const dKids = ((dg as any).children as any[]) ?? [];
      const hasDGD = dKids.some((n: any) => n?.name === 'DatiGeneraliDocumento');
      if (hasDGD) {
        (dg as any).children = [...dKids].sort((a: any, b: any) => {
          const aKey = a?.name ?? '';
          const bKey = b?.name ?? '';
          if (aKey === 'DatiGeneraliDocumento' && bKey !== 'DatiGeneraliDocumento') return -1;
          if (bKey === 'DatiGeneraliDocumento' && aKey !== 'DatiGeneraliDocumento') return 1;
          return 0;
        });
      }
    }

    reorderChildren(body, ['DatiGenerali', 'DatiBeniServizi', 'DatiVeicoli', 'DatiPagamento', 'Allegati']);
    const dbs = findChildByTag(body, 'DatiBeniServizi');
    if (dbs) reorderChildren(dbs, ['DettaglioLinee', 'DatiRiepilogo']);
  }

  // serializar
  return (root as any).end({ pretty: true }) as string;
}

// ---------- API pública ----------
export async function excelToXmlFromSingleXlsx(
  xlsxBuf: ArrayBuffer | Uint8Array | NodeBuffer,
  opts: XmlOpts = { mode: 'xsd', includeXmlDecl: true }
): Promise<{ filename: string; xml: string }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(toNodeBuffer(xlsxBuf) as any);
  const ws = wb.worksheets[0];

  const idToTag = buildIdToTagMapFromSameSheet(ws);
  const idToPath = buildIdToPath(idToTag);
  const leafIds = extractLeafIdsFromSameSheet(ws);

  const outputs: { filename: string; xml: string }[] = [];
  let rowCounter = 0;

  const maxR = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC = (ws as any).actualColumnCount ?? ws.columnCount;

  for (let r = 2; r <= maxR; r++) {
    const row = ws.getRow(r);
    const values: any[] = [];
    for (let c = 1; c <= maxC; c++) values.push(row.getCell(c).value);

    const nonEmpty = values.filter((v) => {
      const s = cellStr(v);
      return s && s.trim();
    });
    if (!nonEmpty.length) continue;

    // saltar filas de mapping (todas con '<')
    const looksMapping = nonEmpty.every((v) => (cellStr(v) ?? '').includes('<'));
    if (looksMapping) continue;

    rowCounter++;
    const xml = processRow(values, leafIds, idToPath, opts);
    outputs.push({ filename: `invoice_${rowCounter}.xml`, xml });
  }
  return outputs;
}
