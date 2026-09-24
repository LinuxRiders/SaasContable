import React from 'react';
import { Construction } from 'lucide-react';

/**
 * Marcador para vistas del subsistema de ingestión que se reconstruyen sobre el modelo contable del SDD v3.0.
 * @param {{ titulo: string, spec: string, descripcion: string }} props
 */
export const EnReconstruccion = ({ titulo, spec, descripcion }) => (
  <div className="content-body">
    <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <Construction size={40} color="#64748B" style={{ marginBottom: '1rem' }} />
      <h2 style={{ marginBottom: '0.5rem' }}>{titulo}: en reconstrucción</h2>
      <p style={{ color: '#64748B', maxWidth: '560px', margin: '0 auto' }}>{descripcion}</p>
      <p className="mono" style={{ color: '#64748B', marginTop: '1rem', fontSize: '0.8rem' }}>{spec}</p>
    </div>
  </div>
);
