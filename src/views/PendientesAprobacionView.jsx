import React from 'react';
import { EnReconstruccion } from '../components/EnReconstruccion.jsx';

export const PendientesAprobacionView = () => (
  <EnReconstruccion
    titulo="Pendientes de aprobación"
    spec="specs/004-doa-aprobacion-checker · SDD v3.0 §5.5"
    descripcion="La aprobación del Checker se reconstruye sobre los asientos generados por el nuevo motor contable."
  />
);
