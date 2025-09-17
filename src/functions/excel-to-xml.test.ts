// lib/excelToXml.ts
import ExcelJS from 'exceljs';
import { create } from 'xmlbuilder';

// -------------------- RegEx --------------------
const ID_TAG_RE = /\s*(\d+(?:\.\d+)*)\s*<([^>]+)>/;
const ID_ONLY_RE = /^(\d+(?:\.\d+)*)\s*</;

// -------------------- Utils --------------------
function cellToString(v: any): string | null {
  if (v === null || v === undefined) return null;
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
  const s = cellToString(value);
  if (!s || !s.trim()) return [];
  const t = s.trim();
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  return [s];
}

function findFirstChildByTag(elem: any, tag: string): any | null {
  const children = (elem as any).children as any[] | undefined;
  if (!children) return null;
  for (const ch of children) if (ch?.name === tag) return ch as any;
  return null;
}

function createPath(root: any, pathTags: string[]): any {
  let current = root;
  for (const tag of pathTags) {
    let child = findFirstChildByTag(current, tag);
    if (!child) child = (current as any).ele(tag) as any;
    current = child;
  }
  return current;
}

function endswithNoNs(tag: string, name: string) {
  return tag === name || tag.endsWith(name);
}

// -------------------- Mappers --------------------
async function buildIdToTagMap(representationBuf: ArrayBuffer | Uint8Array): Promise<Map<string, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(representationBuf instanceof Uint8Array ? representationBuf : new Uint8Array(representationBuf));
  const ws = wb.worksheets[0];

  let headerRowIdx = -1;
  ws.eachRow((row, i) => {
    const c1 = cellToString(row.getCell(1).value);
    if (headerRowIdx < 0 && c1?.includes('ID e Nome')) headerRowIdx = i;
  });
  if (headerRowIdx < 0) throw new Error('No se encontró "ID e Nome"');

  const idToTag = new Map<string, string>();
  for (let r = headerRowIdx + 1; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= ws.actualColumnCount; c++) {
      const val = cellToString(row.getCell(c).value);
      if (val?.includes('<')) {
        const m = ID_TAG_RE.exec(val);
        if (m) {
          idToTag.set(m[1], m[2]);
          break;
        }
      }
    }
  }
  return idToTag;
}

function buildIdToPath(idToTag: Map<string, string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [id] of idToTag) {
    const parts = id.split('.');
    const path: string[] = [];
    for (let i = 1; i <= parts.length; i++) {
      const pref = parts.slice(0, i).join('.');
      const t = idToTag.get(pref);
      if (t) path.push(t);
    }
    map.set(id, path);
  }
  return map;
}

async function extractLeafIds(mappingBuf: ArrayBuffer | Uint8Array): Promise<Map<number, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(mappingBuf instanceof Uint8Array ? mappingBuf : new Uint8Array(mappingBuf));
  const ws = wb.worksheets[0];

  const colToId = new Map<number, string>();
  for (let col = 1; col <= ws.actualColumnCount; col++) {
    let idCode: string | null = null;
    for (let row = ws.actualRowCount; row >= 1; row--) {
      const val = cellToString(ws.getRow(row).getCell(col).value);
      if (val?.includes('<')) {
        const m = ID_ONLY_RE.exec(val);
        if (m) {
          idCode = m[1];
          break;
        }
      }
    }
    if (idCode) colToId.set(col, idCode);
  }
  return colToId;
}

// -------------------- XML por fila --------------------
type ValuesById = Map<string, string[]>;

function processRow(values: any[], leafIds: Map<number, string>, idToPath: Map<string, string[]>) {
  const root: any = create('FatturaElettronica');

  const valuesById: ValuesById = new Map();
  for (const [colIdx, idCode] of leafIds) {
    const i = colIdx - 1;
    if (i < 0 || i >= values.length) continue;
    const items = parseMaybeJsonArray(values[i]);
    if (items.length) valuesById.set(idCode, items);
  }

  // --- DatiOrdineAcquisto
  const processed = new Set<string>();
  const datiOrdineIds = [...valuesById.keys()].filter((id) => id.startsWith('2.1.2.'));
  if (datiOrdineIds.length) {
    const rifId = '2.1.2.1';
    const docId = '2.1.2.2';
    if (valuesById.has(rifId) && valuesById.has(docId)) {
      const rifVals = valuesById.get(rifId)!;
      const docVals = valuesById.get(docId)!;
      const generaliPath = idToPath.get('2.1');
      if (generaliPath?.length) {
        const generali = createPath(root, generaliPath);
        const map = new Map<string, string[]>();

        if (rifVals.length === docVals.length) {
          rifVals.forEach((rif, i) => {
            const doc = String(docVals[i]);
            if (!map.has(doc)) map.set(doc, []);
            map.get(doc)!.push(String(rif));
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
            const doc = String(docVals[i]);
            if (!map.has(doc)) map.set(doc, []);
            map.get(doc)!.push(String(rifVals[i]));
          }
        }

        for (const [doc, rifList] of map) {
          const nodo: any = generali.ele('DatiOrdineAcquisto');
          rifList.forEach((r) => nodo.ele('RiferimentoNumeroLinea').txt(r.replace(/\n/g, ' ').trim()));
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

  // --- Grupos repetidos
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
      if (!groupPath) groupPath = idToPath.get(ids[0])!.slice(0, -1);
      const parentPath = groupPath.slice(0, -1);
      const groupTag = groupPath[groupPath.length - 1];
      const sorted = [...ids].sort(numCmp);

      for (let i = 0; i < maxLen; i++) {
        const parent = createPath(root, parentPath);
        const group = (parent as any).ele(groupTag) as any;
        for (const idC of sorted) {
          const list = valuesById.get(idC)!;
          if (i >= list.length) continue;
          const val = list[i];
          if (val == null || !String(val).trim()) continue;
          const leafTag = idToPath.get(idC)!.slice(-1)[0];
          group.ele(leafTag).txt(String(val).replace(/\n/g, ' ').trim());
        }
      }
      ids.forEach((id) => processed.add(id));
    }
  }

  // --- Singles
  for (const [id, items] of valuesById) {
    if (processed.has(id)) continue;
    const pathTags = idToPath.get(id);
    if (!pathTags?.length) continue;
    const parentPath = pathTags.slice(0, -1);
    const leaf = pathTags[pathTags.length - 1];
    const parent = createPath(root, parentPath);
    for (const v of items) {
      if (v == null || !String(v).trim()) continue;
      (parent as any).ele(leaf).txt(String(v).replace(/\n/g, ' ').trim());
    }
  }

  // Atributos raíz
  root.att('xmlns', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');
  root.att('versione', 'FPR12');

  // Reorden header/body
  let header: any = null;
  let body: any = null;
  const kids = ((root as any).children as any[]) ?? [];
  for (const ch of kids) {
    if (ch?.name && endswithNoNs(ch.name, 'FatturaElettronicaHeader')) header = ch;
    if (ch?.name && endswithNoNs(ch.name, 'FatturaElettronicaBody')) body = ch;
  }
  if (header && body) {
    (root as any).remove(header);
    (root as any).remove(body);
    (root as any).import(header);
    (root as any).import(body);
  }
  if (header) header.att('xmlns', '');
  if (body) body.att('xmlns', '');

  // Mover DatiGeneraliDocumento al inicio
  if (body) {
    const bkids = ((body as any).children as any[]) ?? [];
    const dg = bkids.find((n: any) => n?.name && endswithNoNs(n.name, 'DatiGenerali'));
    if (dg) {
      const dKids = ((dg as any).children as any[]) ?? [];
      const idx = dKids.findIndex((n: any) => n?.name && endswithNoNs(n.name, 'DatiGeneraliDocumento'));
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

// -------------------- API pública --------------------
export async function excelToXmlFromBuffers(
  populatedBuf: ArrayBuffer | Uint8Array,
  mappingBuf: ArrayBuffer | Uint8Array,
  representationBuf: ArrayBuffer | Uint8Array
): Promise<{ filename: string; xml: string }[]> {
  const leafIds = await extractLeafIds(mappingBuf);
  const idToTag = await buildIdToTagMap(representationBuf);
  const idToPath = buildIdToPath(idToTag);

  const wbData = new ExcelJS.Workbook();
  await wbData.xlsx.load(populatedBuf instanceof Uint8Array ? populatedBuf : new Uint8Array(populatedBuf));
  const ws = wbData.worksheets[0];

  const outputs: { filename: string; xml: string }[] = [];
  let rowCounter = 0;

  for (let r = 2; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);
    const values: any[] = [];
    for (let c = 1; c <= ws.actualColumnCount; c++) values.push(row.getCell(c).value);

    const nonEmpty = values.filter((v) => {
      const s = cellToString(v);
      return s && s.trim();
    });
    if (!nonEmpty.length) continue;

    const looksMapping = nonEmpty.every((v) => (cellToString(v) ?? '').includes('<'));
    if (looksMapping) continue;

    rowCounter++;
    const xml = processRow(values, leafIds, idToPath);
    outputs.push({ filename: `invoice_${rowCounter}.xml`, xml });
  }
  return outputs;
}
