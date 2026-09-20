import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { FileCode2, ArrowRight, CheckCircle2 } from 'lucide-react';

export const PlantillasView = () => {
  const { plantillas } = useAccounting();

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Plantillas Configuradas" 
          value={plantillas.length} 
          subtext="Reglas de enlace contable" 
          badgeText="Sin IA" 
          badgeType="info" 
        />
        <MetricCard 
          title="Automatización Compras" 
          value={plantillas.filter(p => p.tipoOperacion === 'COMPRA').length} 
          subtext="Mapeo a 60, 63, 65" 
          badgeText="Egresos" 
          badgeType="success" 
        />
        <MetricCard 
          title="Automatización Ventas" 
          value={plantillas.filter(p => p.tipoOperacion === 'VENTA').length} 
          subtext="Mapeo a 70 y 12" 
          badgeText="Ingresos" 
          badgeType="success" 
        />
        <MetricCard 
          title="Tasa de Acierto de Asiento" 
          value="100%" 
          subtext="Reglas determinísticas sin fallas" 
          badgeText="Preciso" 
          badgeType="success" 
        />
      </div>

      <div className="callout callout--info">
        <strong>Plantillas de Automatización (Sin IA):</strong> Permiten que un operador o administrativo ingrese comprobantes sin conocer códigos contables difíciles. El sistema asocia la plantilla seleccionada directamente a las cuentas de base, IGV y contrapartida.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {plantillas.map(pl => (
          <div 
            key={pl.id} 
            className="card" 
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E2E8F0', 
              borderRadius: '8px', 
              padding: '18px',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="mono" style={{ fontWeight: 700, color: '#2563EB', fontSize: '13px' }}>
                {pl.codigo}
              </span>
              <span className={`badge badge--${pl.tipoOperacion === 'COMPRA' ? 'warning' : 'success'}`}>
                {pl.tipoOperacion}
              </span>
            </div>

            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', marginBottom: '6px' }}>
              {pl.nombre}
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', lineHeight: '1.4' }}>
              {pl.descripcion}
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                Mapeo de Cuentas:
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#64748B' }}>Cuenta Base:</span>
                <span className="mono font-bold" style={{ color: '#2563EB' }}>{pl.cuentaBase}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#64748B' }}>Cuenta Impuesto (IGV):</span>
                <span className="mono font-bold" style={{ color: '#10B981' }}>{pl.cuentaImpuesto}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748B' }}>Cuenta Obligación / Derecho:</span>
                <span className="mono font-bold" style={{ color: '#F59E0B' }}>{pl.cuentaObligacion}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
