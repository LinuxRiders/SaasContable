export function toAccountingPeriod(issueDate) {
  // issueDate is "YYYY-MM-DD"
  const [ejercicio, monthStr] = issueDate.split('-');
  const mes = parseInt(monthStr, 10);
  return {
    ejercicio,
    mes,
    accountingPeriod: `${ejercicio}-${monthStr}`
  };
}

export function isPeriodOpen(empresa, issueDate) {
  const { ejercicio, mes } = toAccountingPeriod(issueDate);
  const p = (empresa.periodos || []).find(p => p.ejercicio === ejercicio && p.mes === mes);
  return p ? p.estado === 'ABIERTO' : false;
}

export function isReadOnly(empresa, activePeriod) {
  if (!activePeriod || !activePeriod.ejercicio) return false;
  
  // Find by ejercicio and nombrePeriodo (or mes, but we use nombrePeriodo or we just match the one we have)
  const p = (empresa.periodos || []).find(
    p => p.ejercicio === activePeriod.ejercicio && p.nombrePeriodo === activePeriod.nombrePeriodo
  );
  
  return p ? p.estado === 'CERRADO' : false;
}

