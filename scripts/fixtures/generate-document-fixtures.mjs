/**
 * Genera los 16 documentos de prueba de ingestión (SDD v3.0 §20.9, spec 002) a partir de
 * `document-fixtures.source.mjs`:
 *   - public/fixtures/documents/<archivo>      archivos reales (XML, JSON, CSV, JPG, PNG, PDF)
 *   - src/data/fixtures/documentFixtures.js    catálogo + huellas SHA-256 + resultados del extractor simulado
 *
 * Uso: node scripts/fixtures/generate-document-fixtures.mjs
 * Requiere Microsoft Edge (o Chrome) para renderizar imágenes y PDF, y Windows PowerShell para convertir a JPG.
 * Rutas alternativas: variables de entorno CHROMIUM_PATH y POWERSHELL_PATH.
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { TENANT, COMMERCIAL_DOCS, JSON_DOCS, CSV_BOLETAS, MANUAL_FORM_DEPRECIATION, FIXTURES } from './document-fixtures.source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = join(ROOT, 'public/fixtures/documents');
const CATALOG_FILE = join(ROOT, 'src/data/fixtures/documentFixtures.js');
const WORK_DIR = join(tmpdir(), 'contableos-fixtures');
const MAX_BYTES = 300 * 1024;

const CHROMIUM = process.env.CHROMIUM_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const POWERSHELL = process.env.POWERSHELL_PATH || 'powershell.exe';

// ---------- utilidades ----------
const money = (minor) => (minor / 100).toFixed(2);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const totalsOf = (doc) => {
  const net = doc.lines.reduce((a, l) => a + l.amountMinor, 0);
  const tax = doc.lines.reduce((a, l) => a + l.taxMinor, 0);
  return { netMinor: net, taxMinor: tax, withheldMinor: 0, totalMinor: net + tax, payableMinor: net + tax };
};

// ---------- XML UBL 2.1 (perfil Perú, datos ficticios) ----------
function partyXml(tag, p) {
  const scheme = p.fiscalIdType === 'RUC' ? '6' : '1';
  return `  <cac:${tag}>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${scheme}">${p.fiscalId}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:${tag}>`;
}
function taxTotalXml(indent, base, tax, cur, rateBp) {
  return `${indent}<cac:TaxTotal>
${indent}  <cbc:TaxAmount currencyID="${cur}">${money(tax)}</cbc:TaxAmount>
${indent}  <cac:TaxSubtotal>
${indent}    <cbc:TaxableAmount currencyID="${cur}">${money(base)}</cbc:TaxableAmount>
${indent}    <cbc:TaxAmount currencyID="${cur}">${money(tax)}</cbc:TaxAmount>
${indent}    <cac:TaxCategory>
${indent}      <cbc:Percent>${rateBp / 100}</cbc:Percent>
${indent}      <cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
${indent}    </cac:TaxCategory>
${indent}  </cac:TaxSubtotal>
${indent}</cac:TaxTotal>`;
}
function ublXml(doc) {
  const isNote = doc.kind === 'CREDIT_NOTE';
  const root = isNote ? 'CreditNote' : 'Invoice';
  const lineTag = isNote ? 'CreditNoteLine' : 'InvoiceLine';
  const qtyTag = isNote ? 'CreditedQuantity' : 'InvoicedQuantity';
  const t = totalsOf(doc);
  const cur = doc.currency;
  const lines = doc.lines.map((l) => `  <cac:${lineTag}>
    <cbc:ID>${l.lineNo}</cbc:ID>
    <cbc:${qtyTag} unitCode="NIU">${l.quantity}</cbc:${qtyTag}>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(l.amountMinor)}</cbc:LineExtensionAmount>
${taxTotalXml('    ', l.amountMinor, l.taxMinor, cur, l.rateBp)}
    <cac:Item>
      <cbc:Description>${esc(l.description)}</cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>${l.itemCode}</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${cur}">${money(l.unitPriceMinor)}</cbc:PriceAmount></cac:Price>
  </cac:${lineTag}>`).join('\n');
  const header = isNote
    ? `  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${doc.reference.series}-${doc.reference.number}</cbc:ReferenceID>
    <cbc:ResponseCode>${doc.reason.code}</cbc:ResponseCode>
    <cbc:Description>${esc(doc.reason.description)}</cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${doc.reference.series}-${doc.reference.number}</cbc:ID>
      <cbc:IssueDate>${doc.reference.issueDate}</cbc:IssueDate>
      <cbc:DocumentTypeCode>${doc.reference.officialCode}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`
    : `  <cbc:InvoiceTypeCode listID="0101">${doc.officialCode}</cbc:InvoiceTypeCode>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Documento de prueba FICTICIO para ContableOS. No tiene validez tributaria. -->
<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${doc.series}-${doc.number}</cbc:ID>
  <cbc:IssueDate>${doc.issueDate}</cbc:IssueDate>
${doc.dueDate ? `  <cbc:DueDate>${doc.dueDate}</cbc:DueDate>\n` : ''}${header}
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
${partyXml('AccountingSupplierParty', doc.issuer)}
${partyXml('AccountingCustomerParty', doc.receiver)}
${taxTotalXml('  ', t.netMinor, t.taxMinor, cur, 1800)}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(t.netMinor)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${money(t.totalMinor)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${money(t.payableMinor)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</${root}>
`;
}

// ---------- HTML de la representación impresa (para foto y PDF) ----------
function invoiceHtml(doc, { style = 'print' } = {}) {
  const t = totalsOf(doc);
  const title = doc.kind === 'CREDIT_NOTE' ? 'NOTA DE CRÉDITO ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
  const cur = doc.currency === 'USD' ? 'US$' : 'S/';
  const rows = doc.lines.map((l) => `<tr><td>${l.quantity}</td><td>NIU</td><td>${esc(l.itemCode)}</td><td>${esc(l.description)}</td><td class="n">${money(l.unitPriceMinor)}</td><td class="n">${money(l.amountMinor)}</td></tr>`).join('');
  const paper = `
  <div class="paper">
    <div class="head">
      <div><div class="brand">${esc(doc.issuer.name)}</div><div class="small">Av. Ficticia 123 – Lima · Documento de prueba sin validez</div></div>
      <div class="box"><div>R.U.C. ${doc.issuer.fiscalId}</div><div class="t">${title}</div><div>${doc.series}-${doc.number}</div></div>
    </div>
    <table class="meta">
      <tr><td>Fecha de emisión:</td><td>${doc.issueDate}</td><td>Moneda:</td><td>${doc.currency}</td></tr>
      <tr><td>Señor(es):</td><td colspan="3">${esc(doc.receiver.name)}</td></tr>
      <tr><td>RUC:</td><td>${doc.receiver.fiscalId}</td><td>Vencimiento:</td><td>${doc.dueDate || '-'}</td></tr>
    </table>
    <table class="items"><thead><tr><th>Cant.</th><th>U.M.</th><th>Código</th><th>Descripción</th><th>P. unit.</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="tot">
      <tr><td>Op. gravada</td><td class="n">${cur} ${money(t.netMinor)}</td></tr>
      <tr><td>IGV 18%</td><td class="n">${cur} ${money(t.taxMinor)}</td></tr>
      <tr class="b"><td>Importe total</td><td class="n">${cur} ${money(t.totalMinor)}</td></tr>
    </table>
    <div class="small foot">Representación impresa de un comprobante FICTICIO generado para pruebas de ContableOS.</div>
  </div>`;
  const photo = style === 'sharp' || style === 'blurry';
  const blur = style === 'blurry' ? 'filter: blur(2.4px) contrast(0.8) brightness(1.05);' : style === 'sharp' ? 'filter: contrast(1.05);' : '';
  const rot = style === 'blurry' ? 'transform: rotate(6deg) skewX(-3deg) scale(0.92);' : style === 'sharp' ? 'transform: rotate(-2deg) scale(0.95);' : '';
  const scan = style === 'scan';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111;
      ${photo ? 'background: radial-gradient(circle at 30% 20%, #8a6a4a, #4a3424 70%); display:flex; align-items:center; justify-content:center; height: 1300px;' : 'background:#fff;'}
      ${scan ? 'background:#f1f1ee; filter: grayscale(1) contrast(1.15);' : ''} }
    .paper { width: 820px; background: #fdfdfb; padding: 36px 40px; ${photo ? 'box-shadow: 0 25px 45px rgba(0,0,0,.55);' : ''} ${rot} ${blur} }
    .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 22px; }
    .brand { font-size: 22px; font-weight: bold; }
    .box { border: 2px solid #111; padding: 10px 18px; text-align:center; font-weight:bold; line-height: 1.6; }
    .box .t { font-size: 15px; }
    .small { font-size: 11px; color:#444; }
    table { width:100%; border-collapse: collapse; font-size: 13px; }
    .meta td { padding: 3px 4px; }
    .items { margin-top: 16px; } .items th, .items td { border: 1px solid #333; padding: 6px; }
    .items th { background:#e9e9e9; }
    .n { text-align:right; }
    .tot { width: 45%; margin: 16px 0 0 auto; } .tot td { padding: 4px 6px; border-bottom: 1px solid #ccc; }
    .tot .b td { font-weight:bold; font-size: 15px; }
    .foot { margin-top: 28px; text-align:center; }
    ${scan ? '.paper { box-shadow:none; background: repeating-linear-gradient(0deg, #fafafa, #fafafa 3px, #f0f0f0 4px); transform: rotate(0.6deg); }' : ''}
  </style></head><body>${paper}</body></html>`;
}

const landscapeHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; height: 900px; background: linear-gradient(#7ec8f0, #cfeaf7 55%, #6d8f4e 55%, #3f5f2c); position: relative; overflow:hidden; }
  .m1 { position:absolute; bottom: 45%; left: -10%; width: 0; height: 0; border-left: 420px solid transparent; border-right: 420px solid transparent; border-bottom: 380px solid #6b6f7a; }
  .m2 { position:absolute; bottom: 45%; left: 40%; width: 0; height: 0; border-left: 380px solid transparent; border-right: 380px solid transparent; border-bottom: 450px solid #585c66; }
  .snow { position:absolute; bottom: calc(45% + 330px); left: 58%; width:0; height:0; border-left: 70px solid transparent; border-right: 70px solid transparent; border-bottom: 90px solid #fff; }
  .sun { position:absolute; top: 80px; right: 140px; width: 110px; height:110px; border-radius:50%; background:#ffe27a; }
</style></head><body><div class="sun"></div><div class="m1"></div><div class="m2"></div><div class="snow"></div></body></html>`;

// ---------- renderizado con Chromium ----------
function chromium(args) {
  execFileSync(CHROMIUM, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${join(WORK_DIR, 'profile')}`, ...args], { stdio: 'ignore', timeout: 120000 });
}
function htmlTo(kind, html, outFile, size = '1000,1300') {
  const src = join(WORK_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}.html`);
  writeFileSync(src, html, 'utf8');
  const url = pathToFileURL(src).href;
  if (kind === 'png') chromium([`--window-size=${size}`, `--screenshot=${outFile}`, url]);
  else chromium(['--no-pdf-header-footer', `--print-to-pdf=${outFile}`, url]);
  if (!existsSync(outFile)) throw new Error(`No se generó ${outFile}`);
}
function pngToJpg(png, jpg, quality = 72) {
  const ps = `Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('${png}'); $e=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }; $p=New-Object System.Drawing.Imaging.EncoderParameters 1; $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]${quality}); $i.Save('${jpg}', $e, $p); $i.Dispose()`;
  execFileSync(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore' });
}

// ---------- resultado del extractor simulado ----------
function extractionFor(fixture, doc, format) {
  const low = new Set(fixture.lowConfidence || []);
  const t = totalsOf(doc);
  const conf = (path, base) => (low.has(path) ? 0.42 : base);
  const hi = format === 'PDF_TEXT' ? 0.99 : format === 'PDF_SCANNED' ? 0.93 : 0.95;
  const provenance = [
    ['documentTypeCode', hi, 'encabezado'], ['series', hi, 'recuadro'], ['number', hi, 'recuadro'], ['issueDate', hi, 'datos'],
    ['currency', hi, 'datos'], ['parties[ISSUER].fiscalId', conf('parties[ISSUER].fiscalId', hi), 'recuadro'],
    ['parties[ISSUER].name', hi, 'encabezado'], ['parties[RECEIVER].fiscalId', hi, 'datos'], ['parties[RECEIVER].name', hi, 'datos'],
    ...doc.lines.flatMap((l, i) => [[`lines[${i}].description`, hi - 0.02, `tabla fila ${i + 1}`], [`lines[${i}].amountMinor`, hi, `tabla fila ${i + 1}`]]),
    ['totals.netMinor', hi, 'totales'], ['taxes[VAT].amountMinor', conf('taxes[VAT].amountMinor', hi), 'totales'],
    ['totals.totalMinor', conf('totals.totalMinor', hi), 'totales']
  ].map(([fieldPath, confidence, location]) => ({ fieldPath, confidence: Math.round(confidence * 100) / 100, location, verifiedByHuman: false }));
  return {
    documentTypeCode: doc.kind === 'CREDIT_NOTE' ? 'CREDIT_NOTE' : 'INVOICE',
    documentTypeConfidence: fixture.lowConfidence ? 0.9 : hi,
    document: {
      series: doc.series, number: doc.number, issueDate: doc.issueDate, dueDate: doc.dueDate || null, currency: doc.currency,
      parties: [
        { role: 'ISSUER', fiscalIdType: doc.issuer.fiscalIdType, fiscalId: doc.issuer.fiscalId, name: doc.issuer.name, countryCode: 'PE' },
        { role: 'RECEIVER', fiscalIdType: doc.receiver.fiscalIdType, fiscalId: doc.receiver.fiscalId, name: doc.receiver.name, countryCode: 'PE' }
      ],
      fields: {},
      lines: doc.lines.map((l) => ({ lineNo: l.lineNo, description: l.description, itemCode: l.itemCode, quantity: l.quantity, unitPriceMinor: l.unitPriceMinor, amountMinor: l.amountMinor, taxes: [{ taxCode: 'VAT', baseMinor: l.amountMinor, rateBp: l.rateBp, amountMinor: l.taxMinor }], fields: {} })),
      taxes: [{ taxCode: 'VAT', baseMinor: t.netMinor, rateBp: 1800, amountMinor: t.taxMinor }],
      withholdings: [], references: [], totals: t
    },
    fieldProvenance: provenance,
    notFound: ['dueDate'].filter(() => !doc.dueDate)
  };
}

// ---------- generación ----------
rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(dirname(CATALOG_FILE), { recursive: true });

const catalog = [];
for (const fx of FIXTURES) {
  const r = fx.render;
  const out = fx.file ? join(OUT_DIR, fx.file) : null;
  let mimeType = null; let sourceFormat = null; let extraction = null;
  const doc = r.doc ? (COMMERCIAL_DOCS[r.doc] || JSON_DOCS[r.doc]) : null;

  if (r.as === 'UBL') { writeFileSync(out, ublXml(doc), 'utf8'); mimeType = 'application/xml'; sourceFormat = 'XML'; }
  else if (r.as === 'BROKEN_XML') { const xml = ublXml(doc); writeFileSync(out, xml.slice(0, Math.floor(xml.length * 0.55)), 'utf8'); mimeType = 'application/xml'; sourceFormat = 'XML'; }
  else if (r.as === 'JSON') { writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8'); mimeType = 'application/json'; sourceFormat = 'JSON'; }
  else if (r.as === 'CSV') { const csv = [CSV_BOLETAS.header, ...CSV_BOLETAS.rows].map((row) => row.join(',')).join('\n') + '\n'; writeFileSync(out, csv, 'utf8'); mimeType = 'text/csv'; sourceFormat = 'CSV'; }
  else if (r.as === 'PHOTO') {
    const png = join(WORK_DIR, `${fx.id}.png`);
    htmlTo('png', invoiceHtml(doc, { style: r.quality }), png);
    pngToJpg(png, out, r.quality === 'blurry' ? 60 : 75);
    mimeType = 'image/jpeg'; sourceFormat = 'IMAGE'; extraction = extractionFor(fx, doc, 'IMAGE');
  } else if (r.as === 'SCANNED_PDF') {
    const png = join(WORK_DIR, `${fx.id}.png`); const jpg = join(WORK_DIR, `${fx.id}.jpg`);
    htmlTo('png', invoiceHtml(doc, { style: 'scan' }), png, '900,1200');
    pngToJpg(png, jpg, 55);
    const img = readFileSync(jpg).toString('base64');
    htmlTo('pdf', `<!doctype html><html><head><style>@page{size:A4;margin:0}body{margin:0}img{width:100%}</style></head><body><img src="data:image/jpeg;base64,${img}"></body></html>`, out);
    mimeType = 'application/pdf'; sourceFormat = 'PDF_SCANNED'; extraction = extractionFor(fx, doc, 'PDF_SCANNED');
  } else if (r.as === 'TEXT_PDF') {
    htmlTo('pdf', invoiceHtml(doc, { style: 'print' }), out);
    mimeType = 'application/pdf'; sourceFormat = 'PDF_TEXT'; extraction = extractionFor(fx, doc, 'PDF_TEXT');
  } else if (r.as === 'LANDSCAPE') {
    htmlTo('png', landscapeHtml, out, '1000,700');
    mimeType = 'image/png'; sourceFormat = 'IMAGE'; extraction = null; // no reconocible
  } else if (r.as === 'FORM') { sourceFormat = 'FORM'; }

  let sha = null; let sizeBytes = null;
  if (out) {
    const buf = readFileSync(out); sha = sha256(buf); sizeBytes = statSync(out).size;
    if (sizeBytes > MAX_BYTES) throw new Error(`${fx.file} pesa ${sizeBytes} bytes (> ${MAX_BYTES})`);
  }
  catalog.push({
    id: fx.id, title: fx.title, fileName: fx.file, url: fx.file ? `/fixtures/documents/${fx.file}` : null,
    mimeType, sourceFormat, sizeBytes, sha256: sha, expected: fx.expected,
    ...(r.as === 'FORM' ? { manualForm: MANUAL_FORM_DEPRECIATION } : {}),
    ...(extraction ? { simulatedExtraction: extraction } : {})
  });
  console.log(`${fx.id}  ${fx.file || '(formulario)'}  ${sizeBytes ?? ''}  ${sha ? sha.slice(0, 12) : ''}`);
}

const banner = `/**
 * GENERADO por scripts/fixtures/generate-document-fixtures.mjs — no editar a mano.
 * Catálogo de los 16 documentos de prueba (SDD v3.0 §20.9, spec 002). Datos ficticios.
 * - sha256: huella del archivo en public/fixtures/documents/ (clave del extractor simulado).
 * - simulatedExtraction: lo que devolvería un OCR para imágenes y PDF (valor + confianza + ubicación).
 * - expected: resultado esperado de la ingestión (intake) y de la interpretación (spec 003).
 */
`;
writeFileSync(CATALOG_FILE, `${banner}export const TENANT_FIXTURE = ${JSON.stringify(TENANT, null, 2)};\n\nexport const DOCUMENT_FIXTURES = ${JSON.stringify(catalog, null, 2)};\n`, 'utf8');
writeFileSync(join(OUT_DIR, 'README.md'), `# Documentos de prueba (ficticios)\n\nGenerados por \`scripts/fixtures/generate-document-fixtures.mjs\`. No tienen validez tributaria. Ver \`src/data/fixtures/documentFixtures.js\` y el SDD §20.9.\n`, 'utf8');
rmSync(WORK_DIR, { recursive: true, force: true });
console.log(`\nCatálogo: ${CATALOG_FILE}`);
