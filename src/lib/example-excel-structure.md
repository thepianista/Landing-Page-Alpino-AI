# Estructura de Excel para Factura Electrónica

Basado en el ejemplo de factura XML proporcionado, aquí está la estructura de Excel que necesitas:

## Estructura de Columnas

| Columna | ID        | Nombre del Campo                             | Ejemplo                                      | Requerido |
| ------- | --------- | -------------------------------------------- | -------------------------------------------- | --------- |
| A       | 1.1.1.1   | IdTrasmittente/IdPaese                       | IT                                           | ✅        |
| B       | 1.1.1.2   | IdTrasmittente/IdCodice                      | 01879020517                                  | ✅        |
| C       | 1.1.2     | ProgressivoInvio                             | 79                                           | ✅        |
| D       | 1.1.3     | FormatoTrasmissione                          | FPR12                                        | ✅        |
| E       | 1.1.4     | CodiceDestinatario                           | KRRH6B9                                      | ✅        |
| F       | 1.2.1.1.1 | CedentePrestatore/IdFiscaleIVA/IdPaese       | CN                                           | ✅        |
| G       | 1.2.1.1.2 | CedentePrestatore/IdFiscaleIVA/IdCodice      | 99999999999                                  | ✅        |
| H       | 1.2.1.3.1 | CedentePrestatore/Denominazione              | Shenzhenshifujieaodianzishangwuyouxiangongsi | ✅        |
| I       | 1.2.1.6   | CedentePrestatore/RegimeFiscale              | RF18                                         | ✅        |
| J       | 1.2.2.4   | CedentePrestatore/Indirizzo                  | 2001HaoHongChangGuangChangSiShiSiCeng4402L3  | ✅        |
| K       | 1.2.2.5   | CedentePrestatore/NumeroCivico               | (opcional)                                   | ❌        |
| L       | 1.2.2.6   | CedentePrestatore/CAP                        | 00000                                        | ✅        |
| M       | 1.2.2.7   | CedentePrestatore/Comune                     | ShenZhenShi                                  | ✅        |
| N       | 1.2.2.9   | CedentePrestatore/Provincia                  | (opcional)                                   | ❌        |
| O       | 1.2.2.10  | CedentePrestatore/Nazione                    | CN                                           | ✅        |
| P       | 1.4.1.1.1 | CessionarioCommittente/IdFiscaleIVA/IdPaese  | IT                                           | ✅        |
| Q       | 1.4.1.1.2 | CessionarioCommittente/IdFiscaleIVA/IdCodice | 03166360218                                  | ✅        |
| R       | 1.4.1.2   | CessionarioCommittente/CodiceFiscale         | 03166360218                                  | ✅        |
| S       | 1.4.1.3.1 | CessionarioCommittente/Denominazione         | EnExpert SNC                                 | ✅        |
| T       | 1.4.2.4   | CessionarioCommittente/Indirizzo             | Via Julius Durst                             | ✅        |
| U       | 1.4.2.5   | CessionarioCommittente/NumeroCivico          | 44                                           | ✅        |
| V       | 1.4.2.6   | CessionarioCommittente/CAP                   | 39042                                        | ✅        |
| W       | 1.4.2.7   | CessionarioCommittente/Comune                | Bressanone                                   | ✅        |
| X       | 1.4.2.8   | CessionarioCommittente/Provincia             | BZ                                           | ✅        |
| Y       | 1.4.2.9   | CessionarioCommittente/Nazione               | IT                                           | ✅        |
| Z       | 1.6       | SoggettoEmittente                            | CC                                           | ❌        |
| AA      | 2.1.1.1   | TipoDocumento                                | TD19                                         | ✅        |
| AB      | 2.1.1.2   | Divisa                                       | EUR                                          | ✅        |
| AC      | 2.1.1.3   | Data                                         | 2025-07-17                                   | ❌        |
| AD      | 2.1.1.4   | Numero                                       | AF01 79/25                                   | ✅        |
| AE      | 2.1.1.5   | ImportoTotaleDocumento                       | 8.81                                         | ❌        |
| AF      | 2.1.2.1   | DatiOrdineAcquisto/RiferimentoNumeroLinea    | 1                                            | ❌        |
| AG      | 2.1.2.2   | DatiOrdineAcquisto/IdDocumento               | IT500CQKS0FHPI                               | ❌        |
| AH      | 2.2.2.1   | DettaglioLinee/NumeroLinea                   | 1                                            | ✅        |
| AI      | 2.2.2.2   | DettaglioLinee/Descrizione                   | QUARKZMAN Cavo a Nastro Piatto...            | ✅        |
| AJ      | 2.2.2.3   | DettaglioLinee/Quantita                      | 1.00                                         | ✅        |
| AK      | 2.2.2.4   | DettaglioLinee/PrezzoUnitario                | 7.22                                         | ✅        |
| AL      | 2.2.2.5   | DettaglioLinee/PrezzoTotale                  | 7.22                                         | ✅        |
| AM      | 2.2.2.6   | DettaglioLinee/AliquotaIVA                   | 22.00                                        | ✅        |
| AN      | 2.2.1.1   | DatiRiepilogo/AliquotaIVA                    | 22.00                                        | ✅        |
| AO      | 2.2.1.2   | DatiRiepilogo/ImponibileImporto              | 7.22                                         | ✅        |
| AP      | 2.2.1.3   | DatiRiepilogo/Imposta                        | 1.59                                         | ✅        |
| AQ      | 2.2.1.4   | DatiRiepilogo/EsigibilitaIVA                 | I                                            | ✅        |
| AR      | 2.4.1     | CondizioniPagamento                          | TP02                                         | ❌        |
| AS      | 2.4.2.1   | DettaglioPagamento/ModalitaPagamento         | MP08                                         | ✅        |
| AT      | 2.4.2.2   | DettaglioPagamento/DataScadenzaPagamento     | 2025-07-17                                   | ❌        |
| AU      | 2.4.2.3   | DettaglioPagamento/ImportoPagamento          | 8.81                                         | ✅        |

## Estructura del Excel

### Fila 1: Encabezados

```
ID e Nome
```

### Fila 2: Mapeo de IDs (ejemplo)

```
1.1.1.1 <IdPaese> | 1.1.1.2 <IdCodice> | 1.1.2 <ProgressivoInvio> | ...
```

### Fila 3: Datos de la factura

```
IT | 01879020517 | 79 | FPR12 | KRRH6B9 | CN | 99999999999 | Shenzhenshifujieaodianzishangwuyouxiangongsi | RF18 | 2001HaoHongChangGuangChangSiShiSiCeng4402L3 | | 00000 | ShenZhenShi | | CN | IT | 03166360218 | 03166360218 | EnExpert SNC | Via Julius Durst | 44 | 39042 | Bressanone | BZ | IT | CC | TD19 | EUR | 2025-07-17 | AF01 79/25 | 8.81 | 1 | IT500CQKS0FHPI | 1 | QUARKZMAN Cavo a Nastro Piatto Idc a 10 Pin, Passo 1,27 mm, connettore Fc a Fc, Lunghezza 10 cm, Filo Jumper Grigio per Computer, display Led, Dvd, 2 Pezzi | 1.00 | 7.22 | 7.22 | 22.00 | 22.00 | 7.22 | 1.59 | I | TP02 | MP08 | 2025-07-17 | 8.81
```

## Notas Importantes

1. **Campos Obligatorios**: Todos los campos marcados con ✅ son obligatorios
2. **Campos Opcionales**: Los campos marcados con ❌ son opcionales pero recomendados
3. **Formato de Fecha**: Usar formato YYYY-MM-DD (ej: 2025-07-17)
4. **Números**: Usar punto como separador decimal (ej: 8.81, 22.00)
5. **Códigos de País**: Usar códigos ISO 3166-1 alpha-2 (IT, CN, etc.)
6. **RegimeFiscale**: Usar códigos RF01-RF19
7. **TipoDocumento**: Usar códigos TD01-TD28
8. **Divisa**: Usar códigos ISO 4217 (EUR, USD, etc.)

## Validaciones Aplicadas

- **IdPaese**: Debe ser un código de país válido (IT, CN, etc.)
- **CAP**: Debe tener exactamente 5 dígitos
- **RegimeFiscale**: Debe ser RF01-RF19
- **TipoDocumento**: Debe ser TD01-TD28
- **Divisa**: Debe ser un código de moneda válido
- **ProgressivoInvio**: Debe ser alfanumérico
- **IdCodice**: Debe contener solo caracteres alfanuméricos, puntos, guiones bajos y guiones

## Uso con la API

```typescript
// Usar el endpoint con mode=portal para fatturacheck.it
const response = await fetch('/api/excel-to-xml-comprehensive?mode=portal&decl=1');
```

El XML generado debería pasar la validación en fatturacheck.it con esta estructura.
