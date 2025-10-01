# XML to Excel Processor

Este módulo proporciona funcionalidad para procesar archivos XML de facturas electrónicas italianas (Fattura Elettronica) y extraer datos estructurados para su uso en archivos Excel.

## Funcionalidad

La implementación TypeScript replica la funcionalidad del script Python `hierarchical_xml_to_excel_by_id_JSON.py` y proporciona:

- **Procesamiento de XML individual**: Extrae datos de archivos XML usando mapeos de ID a rutas de tags
- **Manejo de arrays JSON**: Para campos repetidos, los valores se codifican como arrays JSON
- **Integración con Excel**: Usa archivos de mapeo Excel para determinar la estructura de datos
- **Procesamiento por lotes**: Soporte para procesar múltiples archivos XML

## Archivos Principales

### `xml-to-excel-processor.ts`
Contiene las funciones principales:
- `processXmlToExcel()`: Procesa un archivo XML individual
- `batchProcessXmlFiles()`: Procesa múltiples archivos XML
- Funciones auxiliares para mapeo de IDs y navegación XML

### `accounting-xml/route.ts`
Endpoint API que integra el procesamiento XML:
- Recibe archivos XML via upload
- Procesa el XML usando el archivo de mapeo Excel
- Envía los datos procesados a N8N
- Retorna los datos extraídos

## Uso

### Procesamiento Individual

```typescript
import { processXmlToExcel } from '@/lib/xml-to-excel-processor';

const xmlContent = '<FatturaElettronica>...</FatturaElettronica>';
const mappingExcel = fs.readFileSync('hierarchical_mapping_fixed.xlsx');

const result = await processXmlToExcel(xmlContent, mappingExcel);

if (result.success) {
  console.log('Datos extraídos:', result.rowValues);
} else {
  console.error('Error:', result.error);
}
```

### Procesamiento por Lotes

```typescript
import { batchProcessXmlFiles } from '@/lib/xml-to-excel-processor';

const xmlFiles = [
  { name: 'invoice1.xml', content: '...' },
  { name: 'invoice2.xml', content: '...' }
];

const results = await batchProcessXmlFiles(xmlFiles, mappingExcel);

for (const [filename, result] of Object.entries(results)) {
  if (result.success) {
    console.log(`${filename}: ${result.rowValues.length} valores extraídos`);
  } else {
    console.error(`${filename}: ${result.error}`);
  }
}
```

## Estructura de Datos

### XmlProcessingResult
```typescript
interface XmlProcessingResult {
  rowValues: string[];    // Array de valores extraídos para cada columna
  success: boolean;       // Indica si el procesamiento fue exitoso
  error?: string;         // Mensaje de error si falló
}
```

### Mapeo de IDs
El sistema usa archivos Excel de mapeo que contienen:
- **ID e Nome**: Mapeo de códigos ID a nombres de tags XML
- **Estructura jerárquica**: Define las rutas de tags para cada ID
- **Columnas de salida**: Determina qué columnas del Excel se llenan

## Archivos Requeridos

Para que el sistema funcione correctamente, necesitas:

1. **`hierarchical_mapping_fixed.xlsx`**: Archivo de mapeo Excel que define la estructura (ubicado en `src/app/data/`)
2. **Archivos XML**: Facturas electrónicas en formato XML estándar italiano

## Integración con N8N

El endpoint `/api/accounting-xml` envía tanto el archivo XML original como los datos procesados a N8N:

```typescript
const n8nForm = new FormData();
n8nForm.append('file', file, file.name);
n8nForm.append('processedData', JSON.stringify({
  rowValues: result.rowValues,
  filename: file.name,
  processedAt: new Date().toISOString()
}));
```

## Manejo de Errores

El sistema maneja varios tipos de errores:
- **Archivo de mapeo no encontrado**: Verifica que `hierarchical_mapping_fixed.xlsx` esté en `data/`
- **XML malformado**: Errores de parsing XML
- **Mapeo inválido**: Problemas con la estructura del archivo Excel
- **Navegación XML fallida**: Tags no encontrados en el XML

## Diferencias con el Script Python

La implementación TypeScript mantiene la misma lógica que el script Python pero con algunas adaptaciones:

1. **Parsing XML**: Usa `xml2js` en lugar de `xml.etree.ElementTree`
2. **Manejo de Excel**: Usa `exceljs` en lugar de `openpyxl`
3. **Tipos**: Incluye tipos TypeScript para mejor desarrollo
4. **Integración**: Se integra directamente con el endpoint API

## Configuración

Asegúrate de tener las dependencias instaladas:

```bash
npm install xml2js @types/xml2js exceljs
```

Y que el archivo de mapeo esté en la ubicación correcta:
```
src/app/data/hierarchical_mapping_fixed.xlsx
```
