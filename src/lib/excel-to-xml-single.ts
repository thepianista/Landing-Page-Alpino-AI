// lib/excelToXml.single.ts
import ExcelJS from 'exceljs';
import { create } from 'xmlbuilder';
import { Buffer as NodeBuffer } from 'node:buffer';

// ---------- util binario para exceljs (Node) ----------
function toNodeBuffer(src: ArrayBuffer | Uint8Array | NodeBuffer): NodeBuffer {
  if (NodeBuffer.isBuffer(src)) return src;
  if (src instanceof Uint8Array) return NodeBuffer.from(src.buffer, src.byteOffset, src.byteLength);
  return NodeBuffer.from(src as ArrayBuffer);
}

// ---------- regex y helpers compartidos ----------
const ID_TAG_RE = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/;
const ID_ONLY_RE = /^(\d+(?:\.\d+)*)\s*</;

function cellStr(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'object') {
    if ((v as any).text) return String((v as any).text);
    if ((v as any).result !== undefined) return String((v as any).result);
    if ((v as Date) instanceof Date) return (v as Date).toISOString();
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

// ---------- fallbacks por secciones / grupos ----------
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

// ---------- 1) ID->Tag (en la MISMA hoja) ----------
function buildIdToTagMapFromSameSheet(ws: ExcelJS.Worksheet): Map<string, string> {
  const idToTag = new Map<string, string>();
  const maxR = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC = (ws as any).actualColumnCount ?? ws.columnCount;

  // a) primero intenta fila que contenga "ID e Nome" en col 1
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

  // b) fallback: busca en las primeras ~10 filas cualquier "N.N <Tag>"
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

  if (!idToTag.size) {
    throw new Error(`No pude construir ID->Tag desde la misma hoja: no encontré "ID e Nome" ni celdas con "N.N <Tag>"`);
  }
  return idToTag;
}

function buildIdToPath(idToTag: Map<string, string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of idToTag.keys()) {
    const parts = id.split('.');
    const path: string[] = [];

    // fuerza contenedores top si el mapping no trae ancestros
    const top = fallbackTopPathFor(id);
    for (const t of top) path.push(t);

    // añade los tags que sí existan en el mapping
    for (let i = 1; i <= parts.length; i++) {
      const pref = parts.slice(0, i).join('.');
      const t = idToTag.get(pref);
      if (t) path.push(t);
    }
    map.set(id, path);
  }
  return map;
}

// ---------- 2) Leaf IDs por columna (desde abajo) ----------
function extractLeafIdsFromSameSheet(ws: ExcelJS.Worksheet): Map<number, string> {
  const maxR = (ws as any).actualRowCount ?? ws.rowCount;
  const maxC = (ws as any).actualColumnCount ?? ws.columnCount;

  const colToId = new Map<number, string>();
  for (let c = 1; c <= maxC; c++) {
    let found: string | null = null;
    for (let r = maxR; r >= 1; r--) {
      const txt = cellStr(ws.getRow(r).getCell(c).value);
      if (!txt) continue;
      const m = txt.match(ID_ONLY_RE);
      if (m) {
        found = m[1];
        break;
      }
    }
    if (found) colToId.set(c, found);
  }
  if (!colToId.size) {
    throw new Error(`No se detectaron IDs hoja al pie de columnas (pattern "N.N <...>").`);
  }
  return colToId;
}

// ---------- 3) Construir 1 XML por fila ----------
function processRow(values: any[], leafIds: Map<number, string>, idToPath: Map<string, string[]>) {
  // incluye declaración XML con utf-8
  const root: any = create('FatturaElettronica', { encoding: 'utf-8' });

  // aseguro contenedores top (los usarán los fallbacks)
  ensurePath(root, ['FatturaElettronicaHeader']);
  ensurePath(root, ['FatturaElettronicaBody']);

  // map ID -> lista de valores (soporta JSON arrays)
  const valuesById = new Map<string, string[]>();
  for (const [colIdx, idCode] of leafIds) {
    const i = colIdx - 1;
    if (i < 0 || i >= values.length) continue;
    const items = parseMaybeJsonArray(values[i]);
    if (items.length) valuesById.set(idCode, items);
  }

  // manejo especial DatiOrdineAcquisto (2.1.2.*)
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

        for (const [doc, rifList] of map) {
          const nodo: any = generali.ele('DatiOrdineAcquisto');
          rifList.forEach((r) => nodo.ele('RiferimentoNumeroLinea').txt(String(r).replace(/\n/g, ' ').trim()));
          nodo.ele('IdDocumento').txt(String(doc).replace(/\n/g, ' ').trim());
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

  // grupos repetidos por prefijo
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

  // grupos repetidos por prefijo (versión defensiva)
  for (const [pref, ids] of groups) {
    const maxLen = Math.max(...ids.map((id) => valuesById.get(id)!.length));
    if (maxLen > 1 && pref.split('.').length > 0) {
      // 1) Intentar obtener la ruta del contenedor (groupPath)
      let groupPath = idToPath.get(pref);

      // Si no hay path para el prefijo, probamos con el primer ID quitando la hoja
      if (!groupPath || groupPath.length === 0) {
        const sample = idToPath.get(ids[0]);
        if (sample && sample.length > 1) {
          groupPath = sample.slice(0, -1);
        }
      }

      // Tag del grupo; si no viene del mapping, infiérelo por prefijo
      let groupTag = groupPath && groupPath.length ? groupPath[groupPath.length - 1] : null;
      if (!groupTag) groupTag = fallbackGroupTagFor(pref);
      if (!groupTag) {
        // no podemos saber el tag de grupo -> degradamos a singles
        continue;
      }

      // Ruta del padre: si no hay, usar fallback top por prefijo
      let parentPath = groupPath ? groupPath.slice(0, -1) : [];
      if (!parentPath.length) parentPath = fallbackTopPathFor(pref);

      const sorted = [...ids].sort(numCmp);

      // 3) Instanciar las repeticiones
      for (let i = 0; i < maxLen; i++) {
        const parent = ensurePath(root, parentPath);
        const group = (parent as any).ele(groupTag) as any;

        for (const idC of sorted) {
          const list = valuesById.get(idC)!;
          if (i >= list.length) continue;
          const val = list[i];
          if (val == null || !String(val).trim()) continue;

          const leafPath = idToPath.get(idC);
          if (!leafPath || leafPath.length === 0) continue; // guard extra
          const leafTag = leafPath[leafPath.length - 1];

          group.ele(leafTag).txt(String(val).replace(/\n/g, ' ').trim());
        }
      }

      ids.forEach((id) => processed.add(id));
    }
  }

  // singles
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

  // atributos y reorden
  root.att('xmlns', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');
  root.att('versione', 'FPR12');

  // detectar header/body sin tocar el root
  let header: any = null,
    body: any = null;
  const kids = ((root as any).children as any[]) ?? [];
  for (const ch of kids) {
    if (ch?.name && endsNoNs(ch.name, 'FatturaElettronicaHeader')) header = ch;
    if (ch?.name && endsNoNs(ch.name, 'FatturaElettronicaBody')) body = ch;
  }

  // set xmlns="" en header/body si existen
  if (header && header !== root) header.att('xmlns', '');
  if (body && body !== root) body.att('xmlns', '');

  // asegurar DatiGeneraliDocumento primero dentro de DatiGenerali
  if (body && body !== root) {
    const bkids = ((body as any).children as any[]) ?? [];
    const dg = bkids.find((n: any) => n?.name && endsNoNs(n.name, 'DatiGenerali'));
    if (dg) {
      const dKids = ((dg as any).children as any[]) ?? [];
      const idx = dKids.findIndex((n: any) => n?.name && endsNoNs(n.name, 'DatiGeneraliDocumento'));
      if (idx > 0) {
        const node = dKids[idx];
        (dg as any).remove(node);
        const rest = ((dg as any).children as any[]) ?? [];
        for (const n of rest) (dg as any).remove(n);
        (dg as any).import(node);
        for (const n of rest) (dg as any).import(n);
      }
    }
  }

  return (root as any).end({ pretty: true }) as string;
}

// ---------- API pública: SOLO 1 XLSX ----------
export async function excelToXmlFromSingleXlsx(
  xlsxBuf: ArrayBuffer | Uint8Array | NodeBuffer
): Promise<{ filename: string; xml: string }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(toNodeBuffer(xlsxBuf) as any);
  const ws = wb.worksheets[0];

  // construir mapas desde la MISMA hoja
  const idToTag = buildIdToTagMapFromSameSheet(ws);
  const idToPath = buildIdToPath(idToTag);
  const leafIds = extractLeafIdsFromSameSheet(ws);

  const outputs: { filename: string; xml: string }[] = [];
  let rowCounter = 0;

  for (let r = 2; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);
    const values: any[] = [];
    for (let c = 1; c <= ws.actualColumnCount; c++) values.push(row.getCell(c).value);

    const nonEmpty = values.filter((v) => {
      const s = cellStr(v);
      return s && s.trim();
    });
    if (!nonEmpty.length) continue;

    // saltar filas que parecen parte del mapping (todas con '<')
    const looksMapping = nonEmpty.every((v) => (cellStr(v) ?? '').includes('<'));
    if (looksMapping) continue;

    rowCounter++;
    const xml = processRow(values, leafIds, idToPath);
    outputs.push({ filename: `invoice_${rowCounter}.xml`, xml });
  }
  return outputs;
}
