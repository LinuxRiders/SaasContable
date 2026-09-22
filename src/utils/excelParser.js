import * as XLSX from 'xlsx';

export const parseExcelPlanContable = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        const accountsMap = new Map();
        
        rawJson.forEach(row => {
          // Normalizar llaves para la lectura flexible
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[key.toUpperCase().trim()] = row[key];
          }

          let rawCuenta = normalizedRow['CUENTA'] || normalizedRow['CODIGO'] || normalizedRow['CÓDIGO'];
          if (!rawCuenta || String(rawCuenta).trim() === '') return;
          
          // Limpiar código de espacios y signos
          let codigo = String(rawCuenta).replace(/[^0-9A-Za-z]/g, '').trim();
          let descripcion = String(normalizedRow['DESCRIPCION'] || normalizedRow['DESCRIPCIÓN'] || normalizedRow['NOMBRE'] || '').trim();
          let rawMoneda = String(normalizedRow['MONEDA'] || '').toUpperCase();
          let moneda = (rawMoneda.includes('DOLAR') || rawMoneda.includes('ME') || rawMoneda === 'USD') ? 'ME' : 'MN';
          
          let amarre1 = String(normalizedRow['AMARRE_1'] || normalizedRow['AMARRE 1'] || normalizedRow['AMARRE_1_DEBE'] || '').trim();
          let amarre2 = String(normalizedRow['AMARRE_2'] || normalizedRow['AMARRE 2'] || normalizedRow['AMARRE_2_HABER'] || '').trim();
          
          let rawTipoAnalisis = String(normalizedRow['TIPO_ANALISIS'] || normalizedRow['TIPO ANALISIS'] || normalizedRow['ANALISIS'] || '').toUpperCase();
          let tipoAnalisis = "Solo Monto / Sin Análisis";
          if (rawTipoAnalisis.includes('DOC') || rawTipoAnalisis.includes('RUC')) tipoAnalisis = "Por Documento / RUC";
          else if (rawTipoAnalisis.includes('BANC') || rawTipoAnalisis.includes('CONCILIACION')) tipoAnalisis = "Banco / Conciliación";
          else if (rawTipoAnalisis.includes('CENTRO') || rawTipoAnalisis.includes('COSTO')) tipoAnalisis = "Centro de Costos";

          let rawExigeCC = String(normalizedRow['EXIGE_CC'] || normalizedRow['CENTRO COSTO'] || normalizedRow['CC'] || '').toUpperCase();
          let requiereCentroCostos = rawExigeCC === 'SI' || rawExigeCC === 'S' || rawExigeCC === 'TRUE' || rawExigeCC === '1';

          let elemento = parseInt(codigo.charAt(0), 10);
          if (isNaN(elemento)) elemento = 0;
          
          accountsMap.set(codigo, {
            codigo,
            descripcion,
            elemento,
            nivel: codigo.length,
            moneda,
            amarre1: amarre1 || undefined,
            amarre2: amarre2 || undefined,
            tipoAnalisis,
            requiereCentroCostos,
            esCuentaU: false // Se calculará después
          });
        });
        
        // Determine esCuentaU and level
        const finalAccounts = Array.from(accountsMap.values());
        const parentCodes = new Set();
        
        finalAccounts.forEach(acc => {
           for (let i = 1; i < acc.codigo.length; i++) {
             parentCodes.add(acc.codigo.substring(0, i));
           }
        });
        
        finalAccounts.forEach(acc => {
          // Es cuenta U si tiene >= 6 dígitos o si nadie la tiene como padre
          acc.esCuentaU = acc.codigo.length >= 6 || !parentCodes.has(acc.codigo);
        });
        
        // Sort by code
        finalAccounts.sort((a, b) => a.codigo.localeCompare(b.codigo));
        
        resolve({
          cuentas: finalAccounts,
          stats: {
            total: finalAccounts.length,
            usables: finalAccounts.filter(c => c.esCuentaU).length,
            conAmarre: finalAccounts.filter(c => c.amarre1 || c.amarre2).length
          }
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
