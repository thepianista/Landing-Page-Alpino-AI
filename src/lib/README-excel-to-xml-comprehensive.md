# Excel to XML Comprehensive Converter

This TypeScript implementation provides the same functionality as the Python script `excel-to-xml.py`, converting hierarchical mapping Excel files into individual XML invoices for Italian electronic invoicing (Fattura Elettronica).

## Features

- **Hierarchical Mapping Support**: Reads Excel files with embedded ID-to-tag mappings
- **JSON Array Processing**: Handles JSON arrays in Excel cells for repeated elements
- **Multiple Output Modes**: Supports both XSD and Portal validation modes
- **Proper XML Structure**: Generates correctly formatted XML with proper namespaces
- **Grouped Elements**: Handles complex groupings like DatiOrdineAcquisto
- **Element Ordering**: Ensures proper element ordering according to specifications
- **Comprehensive Validation**: Validates all mandatory fields and formats
- **fatturacheck.it Compatible**: Generates XML that passes Italian electronic invoice validation
- **Detailed Error Messages**: Provides specific validation error messages for missing or invalid fields

## API Endpoints

### GET `/api/excel-to-xml-comprehensive`

Converts Google Sheets to XML invoices.

**Parameters:**

- `sheetId`: Google Sheets ID
- `gid`: Sheet GID
- `mode`: 'xsd' (default) or 'portal'
- `decl`: '1' (default) or '0' for XML declaration

**Example:**

```
GET /api/excel-to-xml-comprehensive?sheetId=123&gid=0&mode=portal&decl=1
```

### POST `/api/excel-to-xml-comprehensive`

Uploads and converts Excel files to XML invoices.

**Form Data:**

- `file`: Excel file
- `mode`: 'xsd' or 'portal'
- `includeXmlDecl`: 'true' or 'false'

## Usage

### Basic Usage

```typescript
import { excelToXml } from '@/lib/excel-to-xml-comprehensive';

const results = await excelToXml(excelBuffer, {
  mode: 'xsd',
  includeXmlDecl: true,
});

results.forEach(({ filename, xml }) => {
  console.log(`Generated ${filename}:`, xml);
});
```

### Advanced Configuration

```typescript
// Portal mode with no XML declaration
const results = await excelToXml(excelBuffer, {
  mode: 'portal',
  includeXmlDecl: false,
});
```

## Excel File Structure

The Excel file should contain:

1. **Header Row**: Row with "ID e Nome" containing ID-to-tag mappings
2. **Data Rows**: Invoice data starting from row 2
3. **Column Mappings**: Each column should have a corresponding ID code

### Example Excel Structure

| Column A          | Column B           | Column C                |
| ----------------- | ------------------ | ----------------------- |
| 1.1.1.1 <IdPaese> | 1.1.1.2 <IdCodice> | 2.1.1.1 <TipoDocumento> |
| IT                | 12345678901        | TD01                    |
| FR                | 98765432109        | TD02                    |

## XML Output

The converter generates XML files with:

- Proper namespace declarations
- Correct element ordering
- Grouped repeated elements
- Validated data formats

### Example Output

```xml
<?xml version="1.0" encoding="utf-8"?>
<FatturaElettronica xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
  <FatturaElettronicaHeader xmlns="">
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>12345678901</IdCodice>
      </IdTrasmittente>
      <!-- ... more elements ... -->
    </DatiTrasmissione>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody xmlns="">
    <!-- ... body elements ... -->
  </FatturaElettronicaBody>
</FatturaElettronica>
```

## Validation

The converter includes comprehensive validation to ensure generated XML passes fatturacheck.it validation:

### Mandatory Fields Validation

- **DatiTrasmissione**: IdPaese, IdCodice, ProgressivoInvio
- **CedentePrestatore**: IdFiscaleIVA, RegimeFiscale, Sede (Indirizzo, CAP, Comune, Nazione)
- **CessionarioCommittente**: Either IdFiscaleIVA OR CodiceFiscale, Sede (Indirizzo, CAP, Comune, Nazione)
- **DatiGeneraliDocumento**: TipoDocumento, Divisa, Numero
- **DatiBeniServizi**: At least one DettaglioLinee and DatiRiepilogo entry
- **DatiPagamento**: At least one DettaglioPagamento entry

### Format Validation

- **Country Codes**: ISO 3166-1 alpha-2 (IT, FR, DE, etc.)
- **RegimeFiscale**: RF01-RF19
- **TipoDocumento**: TD01-TD28
- **Divisa**: ISO 4217 currency codes (EUR, USD, etc.)
- **CAP**: Exactly 5 digits
- **ProgressivoInvio**: Alphanumeric
- **IdCodice**: Alphanumeric with dots, underscores, and hyphens

### Error Handling

When validation fails, the converter provides detailed error messages:

```typescript
try {
  const results = await excelToXml(excelBuffer);
} catch (error) {
  if (error.message.includes('Errores de validación')) {
    console.error('Validation errors:', error.message);
    // Parse and display specific validation errors
  }
}
```

## Differences from Python Version

1. **Single File Processing**: Currently processes single Excel files with embedded mappings
2. **TypeScript Types**: Full type safety with TypeScript interfaces
3. **Modern APIs**: Uses modern JavaScript/TypeScript features
4. **Error Handling**: Comprehensive error handling with detailed messages
5. **Built-in Validation**: Validates all mandatory fields and formats before XML generation
6. **fatturacheck.it Compatibility**: Generates XML that passes Italian electronic invoice validation

## Migration from Python

To migrate from the Python script:

1. Replace `excel-to-xml.py` calls with the TypeScript API
2. Update file handling to use ArrayBuffer instead of file paths
3. Use the new API endpoints for web integration
4. Update error handling to use JavaScript Error objects

## Testing

Run tests with:

```bash
npm test -- excel-to-xml-comprehensive
```

## Dependencies

- `exceljs`: Excel file processing
- `xmlbuilder`: XML generation
- `jszip`: ZIP file creation for multiple outputs

## License

Same as the main project.
