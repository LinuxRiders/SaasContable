import { useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { mapSessionRole } from '../domain/ingestion/permissions';
import { isReadOnly as checkPeriodReadOnly } from '../domain/ingestion/periods';

export function useIngestionContext() {
  const { empresaActiva, sesionUsuario, ejercicioActivo, periodoActivo } = useAccounting();

  return useMemo(() => {
    if (!empresaActiva || !sesionUsuario) {
      return null;
    }

    const role = mapSessionRole(sesionUsuario.rol);
    const activePeriod = {
      ejercicio: ejercicioActivo,
      nombrePeriodo: periodoActivo
    };

    const isPeriodClosed = checkPeriodReadOnly(empresaActiva, activePeriod);
    const readOnly = role !== 'MAKER' || isPeriodClosed;

    return {
      tenantId: empresaActiva.id,
      userId: sesionUsuario.usuarioId,
      role,
      activePeriod,
      readOnly
    };
  }, [empresaActiva, sesionUsuario, ejercicioActivo, periodoActivo]);
}

