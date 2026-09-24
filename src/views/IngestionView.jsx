import React from 'react';
import { EnReconstruccion } from '../components/EnReconstruccion.jsx';

export const IngestionView = () => (
  <EnReconstruccion
    titulo="Ingestión de documentos"
    spec="specs/002-ingestion-pipeline · SDD v3.0 §5.3, RF-20"
    descripcion="La ingestión multiformato (XML, JSON, CSV, PDF e imágenes) se reconstruye sobre el documento canónico genérico del motor contable."
  />
);
