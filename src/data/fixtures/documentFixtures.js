/**
 * GENERADO por scripts/fixtures/generate-document-fixtures.mjs — no editar a mano.
 * Catálogo de los 16 documentos de prueba (SDD v3.0 §20.9, spec 002). Datos ficticios.
 * - sha256: huella del archivo en public/fixtures/documents/ (clave del extractor simulado).
 * - simulatedExtraction: lo que devolvería un OCR para imágenes y PDF (valor + confianza + ubicación).
 * - expected: resultado esperado de la ingestión (intake) y de la interpretación (spec 003).
 */
export const TENANT_FIXTURE = {
  "tenantId": "01",
  "fiscalIdType": "RUC",
  "fiscalId": "20450656934",
  "name": "PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA"
};

export const DOCUMENT_FIXTURES = [
  {
    "id": "DOC-01",
    "title": "Factura de mercadería (XML UBL)",
    "fileName": "01-factura-mercaderia.xml",
    "url": "/fixtures/documents/01-factura-mercaderia.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 3117,
    "sha256": "b3e854fd047fd6adf5bd4ac08c0027155addebfa7a1b691c3362558f6603c4e9",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE"
    }
  },
  {
    "id": "DOC-02",
    "title": "Factura con mercadería y flete (XML UBL)",
    "fileName": "02-factura-mixta.xml",
    "url": "/fixtures/documents/02-factura-mixta.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 4086,
    "sha256": "7c717d9c9cbad7b125d43f1dabf65742c48d973ae43a131531cba73e83fbf7c6",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_INPUT:MISSING_DIMENSION",
      "template": "PE.RECEIVED.INVOICE.PURCHASE_MIXED",
      "note": "La línea de flete exige centro de costo; el Maker lo informa (CC-LOGISTICA)."
    }
  },
  {
    "id": "DOC-03",
    "title": "Nota de crédito por devolución (XML UBL)",
    "fileName": "03-nota-credito.xml",
    "url": "/fixtures/documents/03-nota-credito.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 3508,
    "sha256": "d946316ecaf524fb4abe924811b5d5330ea7c742529ba0c79dce761286f51d97",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.RECEIVED.CREDIT_NOTE.PURCHASE_RETURN",
      "note": "Requiere haber cargado antes DOC-01 (referencia)."
    }
  },
  {
    "id": "DOC-04",
    "title": "Factura emitida por la empresa (XML UBL)",
    "fileName": "04-factura-emitida.xml",
    "url": "/fixtures/documents/04-factura-emitida.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 3122,
    "sha256": "d577953578d2d80262c6ade13993b542b2f3406482b2f3f1159f103c1987d955",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.ISSUED.INVOICE.MERCHANDISE_SALE"
    }
  },
  {
    "id": "DOC-05",
    "title": "Factura en dólares (XML UBL)",
    "fileName": "05-factura-usd.xml",
    "url": "/fixtures/documents/05-factura-usd.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 3120,
    "sha256": "10823dc5cdc38deed94b2c21e6b24ba47e315049826511bdda249d6071fd7c5b",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE",
      "note": "Con el servicio FX caído: tasa provisional y Checker obligatorio."
    }
  },
  {
    "id": "DOC-06",
    "title": "Recibo por honorarios con retención (JSON)",
    "fileName": "06-recibo-honorarios.json",
    "url": "/fixtures/documents/06-recibo-honorarios.json",
    "mimeType": "application/json",
    "sourceFormat": "JSON",
    "sizeBytes": 1112,
    "sha256": "671e5eea9d11b5b25bb7c38f222f76236d8e31c161e26768b2476357841e9b35",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.RECEIVED.PROFESSIONAL_FEE_RECEIPT.PROFESSIONAL_FEES"
    }
  },
  {
    "id": "DOC-07",
    "title": "Resumen de planilla de setiembre (JSON)",
    "fileName": "07-resumen-planilla.json",
    "url": "/fixtures/documents/07-resumen-planilla.json",
    "mimeType": "application/json",
    "sourceFormat": "JSON",
    "sizeBytes": 941,
    "sha256": "cc55fb3c8ec8fe0f1b801db35dbd862e3e33f711468cecf414a1ea6ca3694867",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL"
    }
  },
  {
    "id": "DOC-08",
    "title": "Lote de 3 boletas de venta (CSV)",
    "fileName": "08-boletas-venta.csv",
    "url": "/fixtures/documents/08-boletas-venta.csv",
    "mimeType": "text/csv",
    "sourceFormat": "CSV",
    "sizeBytes": 444,
    "sha256": "edd63d27794d8ac04ccf5e9c11cb13de41d94e877490c3e3c2c6041349502a11",
    "expected": {
      "intake": "RECEIVED x3",
      "interpretation": "PENDING_INPUT:CLASSIFICATION_REQUIRED",
      "note": "Venta de bienes o de servicios: la decide el Maker. Al clasificar como SERVICE_SALE queda NO_TEMPLATE porque no hay plantilla base para boletas emitidas (el Admin debe crearla)."
    }
  },
  {
    "id": "DOC-09",
    "title": "Foto nítida de una factura de mercadería (JPG)",
    "fileName": "09-foto-factura-nitida.jpg",
    "url": "/fixtures/documents/09-foto-factura-nitida.jpg",
    "mimeType": "image/jpeg",
    "sourceFormat": "IMAGE",
    "sizeBytes": 61248,
    "sha256": "ab374349857bc5212fcb4fec1855b72841318dd82c3b9d1baa7bfad6d16dac71",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE",
      "note": "Leída de imagen: la DoA exige Checker."
    },
    "simulatedExtraction": {
      "documentTypeCode": "INVOICE",
      "documentTypeConfidence": 0.95,
      "document": {
        "series": "F001",
        "number": "00000130",
        "issueDate": "2026-09-16",
        "dueDate": "2026-10-16",
        "currency": "PEN",
        "parties": [
          {
            "role": "ISSUER",
            "fiscalIdType": "RUC",
            "fiscalId": "20100000009",
            "name": "DISTRIBUIDORA ANDINA DEMO S.A.C.",
            "countryCode": "PE"
          },
          {
            "role": "RECEIVER",
            "fiscalIdType": "RUC",
            "fiscalId": "20450656934",
            "name": "PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA",
            "countryCode": "PE"
          }
        ],
        "fields": {},
        "lines": [
          {
            "lineNo": 1,
            "description": "Bastones de trekking (par)",
            "itemCode": "MER-003",
            "quantity": 10,
            "unitPriceMinor": 4000,
            "amountMinor": 40000,
            "taxes": [
              {
                "taxCode": "VAT",
                "baseMinor": 40000,
                "rateBp": 1800,
                "amountMinor": 7200
              }
            ],
            "fields": {}
          }
        ],
        "taxes": [
          {
            "taxCode": "VAT",
            "baseMinor": 40000,
            "rateBp": 1800,
            "amountMinor": 7200
          }
        ],
        "withholdings": [],
        "references": [],
        "totals": {
          "netMinor": 40000,
          "taxMinor": 7200,
          "withheldMinor": 0,
          "totalMinor": 47200,
          "payableMinor": 47200
        }
      },
      "fieldProvenance": [
        {
          "fieldPath": "documentTypeCode",
          "confidence": 0.95,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "series",
          "confidence": 0.95,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "number",
          "confidence": 0.95,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "issueDate",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "currency",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].fiscalId",
          "confidence": 0.95,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].name",
          "confidence": 0.95,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].fiscalId",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].name",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].description",
          "confidence": 0.93,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].amountMinor",
          "confidence": 0.95,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.netMinor",
          "confidence": 0.95,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "taxes[VAT].amountMinor",
          "confidence": 0.95,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.totalMinor",
          "confidence": 0.95,
          "location": "totales",
          "verifiedByHuman": false
        }
      ],
      "notFound": []
    }
  },
  {
    "id": "DOC-10",
    "title": "Foto borrosa de una factura (JPG)",
    "fileName": "10-foto-factura-borrosa.jpg",
    "url": "/fixtures/documents/10-foto-factura-borrosa.jpg",
    "mimeType": "image/jpeg",
    "sourceFormat": "IMAGE",
    "sizeBytes": 33782,
    "sha256": "c83354071ea9e06caec61d07fa9f47ae798434adceeea8b8954c3abfb0742ed8",
    "expected": {
      "intake": "RECEIVED_NEEDS_REVIEW",
      "interpretation": "PENDING_INPUT:LOW_CONFIDENCE_EXTRACTION"
    },
    "simulatedExtraction": {
      "documentTypeCode": "INVOICE",
      "documentTypeConfidence": 0.9,
      "document": {
        "series": "F001",
        "number": "00000131",
        "issueDate": "2026-09-17",
        "dueDate": "2026-10-17",
        "currency": "PEN",
        "parties": [
          {
            "role": "ISSUER",
            "fiscalIdType": "RUC",
            "fiscalId": "20100000009",
            "name": "DISTRIBUIDORA ANDINA DEMO S.A.C.",
            "countryCode": "PE"
          },
          {
            "role": "RECEIVER",
            "fiscalIdType": "RUC",
            "fiscalId": "20450656934",
            "name": "PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA",
            "countryCode": "PE"
          }
        ],
        "fields": {},
        "lines": [
          {
            "lineNo": 1,
            "description": "Linternas frontales LED",
            "itemCode": "MER-004",
            "quantity": 10,
            "unitPriceMinor": 3000,
            "amountMinor": 30000,
            "taxes": [
              {
                "taxCode": "VAT",
                "baseMinor": 30000,
                "rateBp": 1800,
                "amountMinor": 5400
              }
            ],
            "fields": {}
          }
        ],
        "taxes": [
          {
            "taxCode": "VAT",
            "baseMinor": 30000,
            "rateBp": 1800,
            "amountMinor": 5400
          }
        ],
        "withholdings": [],
        "references": [],
        "totals": {
          "netMinor": 30000,
          "taxMinor": 5400,
          "withheldMinor": 0,
          "totalMinor": 35400,
          "payableMinor": 35400
        }
      },
      "fieldProvenance": [
        {
          "fieldPath": "documentTypeCode",
          "confidence": 0.95,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "series",
          "confidence": 0.95,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "number",
          "confidence": 0.95,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "issueDate",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "currency",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].fiscalId",
          "confidence": 0.42,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].name",
          "confidence": 0.95,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].fiscalId",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].name",
          "confidence": 0.95,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].description",
          "confidence": 0.93,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].amountMinor",
          "confidence": 0.95,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.netMinor",
          "confidence": 0.95,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "taxes[VAT].amountMinor",
          "confidence": 0.42,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.totalMinor",
          "confidence": 0.42,
          "location": "totales",
          "verifiedByHuman": false
        }
      ],
      "notFound": []
    }
  },
  {
    "id": "DOC-11",
    "title": "Factura de equipo de cómputo escaneada (PDF)",
    "fileName": "11-factura-computo-escaneada.pdf",
    "url": "/fixtures/documents/11-factura-computo-escaneada.pdf",
    "mimeType": "application/pdf",
    "sourceFormat": "PDF_SCANNED",
    "sizeBytes": 47862,
    "sha256": "b626cf6ba83e7f662e4b7f8e27814e0655baed4e2d04a1af86a5df71e375b79d",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_INPUT:CLASSIFICATION_REQUIRED",
      "note": "¿Activo fijo o gasto? Lo decide el Maker (o la regla propuesta si el Admin la activa)."
    },
    "simulatedExtraction": {
      "documentTypeCode": "INVOICE",
      "documentTypeConfidence": 0.93,
      "document": {
        "series": "F003",
        "number": "00000077",
        "issueDate": "2026-09-19",
        "dueDate": "2026-10-19",
        "currency": "PEN",
        "parties": [
          {
            "role": "ISSUER",
            "fiscalIdType": "RUC",
            "fiscalId": "20100000033",
            "name": "TECNO EQUIPOS DEMO S.A.C.",
            "countryCode": "PE"
          },
          {
            "role": "RECEIVER",
            "fiscalIdType": "RUC",
            "fiscalId": "20450656934",
            "name": "PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA",
            "countryCode": "PE"
          }
        ],
        "fields": {},
        "lines": [
          {
            "lineNo": 1,
            "description": "Laptop 14\" para oficina (equipo de cómputo)",
            "itemCode": "EQ-LAP-14",
            "quantity": 1,
            "unitPriceMinor": 300000,
            "amountMinor": 300000,
            "taxes": [
              {
                "taxCode": "VAT",
                "baseMinor": 300000,
                "rateBp": 1800,
                "amountMinor": 54000
              }
            ],
            "fields": {}
          }
        ],
        "taxes": [
          {
            "taxCode": "VAT",
            "baseMinor": 300000,
            "rateBp": 1800,
            "amountMinor": 54000
          }
        ],
        "withholdings": [],
        "references": [],
        "totals": {
          "netMinor": 300000,
          "taxMinor": 54000,
          "withheldMinor": 0,
          "totalMinor": 354000,
          "payableMinor": 354000
        }
      },
      "fieldProvenance": [
        {
          "fieldPath": "documentTypeCode",
          "confidence": 0.93,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "series",
          "confidence": 0.93,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "number",
          "confidence": 0.93,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "issueDate",
          "confidence": 0.93,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "currency",
          "confidence": 0.93,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].fiscalId",
          "confidence": 0.93,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].name",
          "confidence": 0.93,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].fiscalId",
          "confidence": 0.93,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].name",
          "confidence": 0.93,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].description",
          "confidence": 0.91,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].amountMinor",
          "confidence": 0.93,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.netMinor",
          "confidence": 0.93,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "taxes[VAT].amountMinor",
          "confidence": 0.93,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.totalMinor",
          "confidence": 0.93,
          "location": "totales",
          "verifiedByHuman": false
        }
      ],
      "notFound": []
    }
  },
  {
    "id": "DOC-12",
    "title": "Foto sin documento (PNG)",
    "fileName": "12-foto-sin-documento.png",
    "url": "/fixtures/documents/12-foto-sin-documento.png",
    "mimeType": "image/png",
    "sourceFormat": "IMAGE",
    "sizeBytes": 26401,
    "sha256": "c43147f0d3086134664ca3ebb9752289f1a8c6964526c771b5ab16ef2b9840dd",
    "expected": {
      "intake": "FAILED",
      "dlqReason": "UNREADABLE"
    }
  },
  {
    "id": "DOC-13",
    "title": "XML malformado",
    "fileName": "13-xml-malformado.xml",
    "url": "/fixtures/documents/13-xml-malformado.xml",
    "mimeType": "application/xml",
    "sourceFormat": "XML",
    "sizeBytes": 1714,
    "sha256": "dc63eaf5bc291423e4b53feb19c0e04df01002786968e3b5478ceeaa97feaeb8",
    "expected": {
      "intake": "FAILED",
      "dlqReason": "MALFORMED"
    }
  },
  {
    "id": "DOC-14",
    "title": "La factura DOC-01 en PDF",
    "fileName": "14-factura-mercaderia.pdf",
    "url": "/fixtures/documents/14-factura-mercaderia.pdf",
    "mimeType": "application/pdf",
    "sourceFormat": "PDF_TEXT",
    "sizeBytes": 64317,
    "sha256": "0ee192edbfb047f95ea89ffd1b79f317a66944d567d5a90395521bc7bdc5df0c",
    "expected": {
      "intake": "DUPLICATE",
      "duplicateOf": "DOC-01",
      "note": "Mismo emisor, tipo, serie-número y fecha que DOC-01."
    },
    "simulatedExtraction": {
      "documentTypeCode": "INVOICE",
      "documentTypeConfidence": 0.99,
      "document": {
        "series": "F001",
        "number": "00000123",
        "issueDate": "2026-09-10",
        "dueDate": "2026-10-10",
        "currency": "PEN",
        "parties": [
          {
            "role": "ISSUER",
            "fiscalIdType": "RUC",
            "fiscalId": "20100000009",
            "name": "DISTRIBUIDORA ANDINA DEMO S.A.C.",
            "countryCode": "PE"
          },
          {
            "role": "RECEIVER",
            "fiscalIdType": "RUC",
            "fiscalId": "20450656934",
            "name": "PACHATUSANTREK SOCIEDAD ANÓNIMA CERRADA",
            "countryCode": "PE"
          }
        ],
        "fields": {},
        "lines": [
          {
            "lineNo": 1,
            "description": "Mochila de trekking 40 L",
            "itemCode": "MER-001",
            "quantity": 20,
            "unitPriceMinor": 5000,
            "amountMinor": 100000,
            "taxes": [
              {
                "taxCode": "VAT",
                "baseMinor": 100000,
                "rateBp": 1800,
                "amountMinor": 18000
              }
            ],
            "fields": {}
          }
        ],
        "taxes": [
          {
            "taxCode": "VAT",
            "baseMinor": 100000,
            "rateBp": 1800,
            "amountMinor": 18000
          }
        ],
        "withholdings": [],
        "references": [],
        "totals": {
          "netMinor": 100000,
          "taxMinor": 18000,
          "withheldMinor": 0,
          "totalMinor": 118000,
          "payableMinor": 118000
        }
      },
      "fieldProvenance": [
        {
          "fieldPath": "documentTypeCode",
          "confidence": 0.99,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "series",
          "confidence": 0.99,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "number",
          "confidence": 0.99,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "issueDate",
          "confidence": 0.99,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "currency",
          "confidence": 0.99,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].fiscalId",
          "confidence": 0.99,
          "location": "recuadro",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[ISSUER].name",
          "confidence": 0.99,
          "location": "encabezado",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].fiscalId",
          "confidence": 0.99,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "parties[RECEIVER].name",
          "confidence": 0.99,
          "location": "datos",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].description",
          "confidence": 0.97,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "lines[0].amountMinor",
          "confidence": 0.99,
          "location": "tabla fila 1",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.netMinor",
          "confidence": 0.99,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "taxes[VAT].amountMinor",
          "confidence": 0.99,
          "location": "totales",
          "verifiedByHuman": false
        },
        {
          "fieldPath": "totals.totalMinor",
          "confidence": 0.99,
          "location": "totales",
          "verifiedByHuman": false
        }
      ],
      "notFound": []
    }
  },
  {
    "id": "DOC-15",
    "title": "Nota de crédito sin referencia (JSON)",
    "fileName": "15-nota-credito-sin-referencia.json",
    "url": "/fixtures/documents/15-nota-credito-sin-referencia.json",
    "mimeType": "application/json",
    "sourceFormat": "JSON",
    "sizeBytes": 1262,
    "sha256": "34fb4a3b2a2011c1e9535f138a0e7f107e001e56c60d201ba109800964aa2cae",
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_INPUT:SCHEMA_INVALID"
    }
  },
  {
    "id": "DOC-16",
    "title": "Depreciación del mes (registro manual)",
    "fileName": null,
    "url": null,
    "mimeType": null,
    "sourceFormat": "FORM",
    "sizeBytes": null,
    "sha256": null,
    "expected": {
      "intake": "RECEIVED",
      "interpretation": "PENDING_APPROVAL",
      "template": "PE.INTERNAL.INTERNAL_DOCUMENT.DEPRECIATION"
    },
    "manualForm": {
      "documentType": "INTERNAL_DOCUMENT",
      "operationTypeCode": "DEPRECIATION",
      "series": "DEP",
      "number": "2026-09",
      "issueDate": "2026-09-30",
      "currency": "PEN",
      "fields": {
        "concept": "Depreciación de activo fijo – setiembre 2026",
        "costCenter": "CC-ADMIN"
      },
      "lines": [
        {
          "lineNo": 1,
          "description": "Equipos de cómputo",
          "amountMinor": 25000,
          "fields": {
            "assetClass": "IT_EQUIPMENT"
          }
        },
        {
          "lineNo": 2,
          "description": "Muebles y enseres",
          "amountMinor": 10000,
          "fields": {
            "assetClass": "FURNITURE"
          }
        }
      ],
      "totals": {
        "netMinor": 35000,
        "taxMinor": 0,
        "withheldMinor": 0,
        "totalMinor": 35000,
        "payableMinor": 0
      }
    }
  }
];
