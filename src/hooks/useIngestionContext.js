import { useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { mapSessionRole } from '../domain/ingestion/permissions';
import { isReadOnly as checkPeriodReadOnly } from '../domain/ingestion/periods';

export function useIngestionContext() {
  const { empresaActiva, sesionUsuario, ejercicioActivo, periodoActivo } = useAccounting();

  return useMemo(() => {
    // Si no hay sesión iniciada, proporcionar contexto seguro de invitado
    const role = sesionUsuario ? mapSessionRole(sesionUsuario.rol) : 'ADMIN';
    const userId = sesionUsuario?.usuarioId || 'admin_pedro';
    const tenantId = empresaActiva?.id || 'global';

    const activePeriod = {
      ejercicio: ejercicioActivo || '2026',
      nombrePeriodo: periodoActivo || '01-2026'
    };

    const isPeriodClosed = empresaActiva ? checkPeriodReadOnly(empresaActiva, activePeriod) : false;
    const readOnly = (role !== 'MAKER' && role !== 'ADMIN') || isPeriodClosed;

    return {
      tenantId,
      userId,
      role,
      activePeriod,
      readOnly
    };
  }, [empresaActiva, sesionUsuario, ejercicioActivo, periodoActivo]);
}

