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
          // Detect columns flexibly
          let rawCuenta = row['CUENTA'] || row['cuenta'] || row['Cuenta'];
          if (rawCuenta === undefined || rawCuenta === null || String(rawCuenta).trim() === '') return;
          
          let codigo = String(rawCuenta).trim();
          let descripcion = (row['DESCRIPCION'] || row['descripcion'] || row['Descripcion'] || '').trim();
          let rawMoneda = String(row['MONEDA'] || row['moneda'] || '').toUpperCase();
          let moneda = (rawMoneda.includes('DOLAR') || rawMoneda.includes('ME')) ? 'ME' : 'MN';
          
          let amarre1 = String(row['AMARRE_1'] || row['amarre1'] || row['Amarre 1'] || '').trim();
          let amarre2 = String(row['AMARRE_2'] || row['amarre2'] || row['Amarre 2'] || '').trim();
          let amarre3 = String(row['AMARRE_3'] || row['amarre3'] || row['Amarre 3'] || '').trim();
          let rubros = String(row['RUBROS'] || row['rubros'] || row['DESRUB'] || '').trim();
          let digitoStr = String(row['DIGITO'] || row['digito'] || '');
          let digito = digitoStr ? parseInt(digitoStr, 10) : undefined;
          
          let elemento = parseInt(codigo.charAt(0), 10);
          if (isNaN(elemento)) elemento = 0;
          
          accountsMap.set(codigo, {
            codigo,
            descripcion,
            elemento,
            moneda,
            amarre1: amarre1 || undefined,
            amarre2: amarre2 || undefined,
            amarre3: amarre3 || undefined,
            rubros: rubros || undefined,
            digito,
            requiereCentroCostos: amarre1 && amarre1.startsWith('9') ? true : false,
          });
        });
        
        // Generate synthetic parents
        const allCodes = Array.from(accountsMap.keys());
        allCodes.forEach(code => {
          for (let i = 1; i < code.length; i++) {
            const parentCode = code.substring(0, i);
            if (!accountsMap.has(parentCode)) {
              accountsMap.set(parentCode, {
                codigo: parentCode,
                descripcion: `CUENTA SINTÉTICA ${parentCode}`,
                elemento: parseInt(parentCode.charAt(0), 10),
                moneda: 'MN',
                esCuentaU: false,
                requiereCentroCostos: false
              });
            }
          }
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
          if (acc.codigo.length <= 3) {
            acc.esCuentaU = false;
          } else {
            acc.esCuentaU = !parentCodes.has(acc.codigo);
          }
        });
        
        // Sort by code
        finalAccounts.sort((a, b) => a.codigo.localeCompare(b.codigo));
        
        resolve({
          cuentas: finalAccounts,
          stats: {
            total: finalAccounts.length,
            usables: finalAccounts.filter(c => c.esCuentaU).length,
            conAmarre: finalAccounts.filter(c => c.amarre1).length
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
