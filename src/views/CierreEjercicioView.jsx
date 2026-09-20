import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { LockKeyhole, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

export const CierreEjercicioView = () => {
  const { 
    vouchers, 
    ejecutarCierreContable, 
    cierreEjecutado,
    empresaActiva 
  } = useAccounting();

  // Calcular ingresos (Elemento 7) y gastos (Elemento 6)
  let totalIngresos = 0;
  let totalGastos = 0;

  vouchers.forEach(v => {
    v.lineas.forEach(l => {
      if (l.cta.startsWith('7') && !l.cta.startsWith('79')) {
        totalIngresos += (l.haber - l.debe);
      } else if (l.cta.startsWith('6')) {
        totalGastos += (l.debe - l.haber);
      }
    });
  });

  const utilidadNeta = totalIngresos - totalGastos;
  const esGanancia = utilidadNeta >= 0;

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Ingresos (Elemento 7)" 
          value={`S/ ${totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Ventas y ganancias operativas" 
          badgeText="Haber 7x" 
          badgeType="success" 
        />
        <MetricCard 
          title="Total Gastos (Elemento 6)" 
          value={`S/ ${totalGastos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Costos y gastos de gestión" 
          badgeText="Debe 6x" 
          badgeType="danger" 
        />
        <MetricCard 
          title={esGanancia ? "Utilidad Neta del Ejercicio" : "Pérdida Neta del Ejercicio"} 
          value={`S/ ${Math.abs(utilidadNeta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext={esGanancia ? "Resultado positivo antes de impuestos" : "Resultado deficitario"} 
          badgeText={esGanancia ? "Ganancia" : "Pérdida"} 
          badgeType={esGanancia ? "success" : "danger"} 
        />
        <MetricCard 
          title="Estado de Cierre" 
          value={cierreEjecutado ? "EJECUTADO" : "PENDIENTE"} 
          subtext={cierreEjecutado ? "Asiento VOU-12-CIERRE generado" : "Listo para procesar"} 
          badgeText={cierreEjecutado ? "Cerrado" : "Abierto"} 
          badgeType={cierreEjecutado ? "success" : "warning"} 
        />
      </div>

      {/* ESTADO DE RESULTADOS RESUMEN */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E2E8F0', 
        borderRadius: '8px', 
        padding: '24px', 
        marginBottom: '20px' 
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '14px' }}>
          ESTADO DE RESULTADOS PRELIMINAR (31 DE DICIEMBRE DE 2026)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: '6px' }}>
            <span style={{ fontWeight: 600 }}>Ventas Netas y Servicios (Elemento 7):</span>
            <span className="mono font-bold" style={{ color: '#10B981', fontSize: '14px' }}>
              S/ {totalIngresos.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: '6px' }}>
            <span style={{ fontWeight: 600 }}>Costo de Ventas y Gastos Operativos (Elemento 6):</span>
            <span className="mono font-bold" style={{ color: '#EF4444', fontSize: '14px' }}>
              (S/ {totalGastos.toFixed(2)})
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '14px', 
            background: esGanancia ? '#ECFDF5' : '#FEF2F2', 
            borderRadius: '6px',
            border: `1px solid ${esGanancia ? '#A7F3D0' : '#FECACA'}`
          }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              {esGanancia ? "UTILIDAD NETA FINAL (Cta 8911):" : "PÉRDIDA NETA FINAL (Cta 8911):"}
            </span>
            <span className="mono font-bold" style={{ fontSize: '18px', color: esGanancia ? '#047857' : '#B91C1C' }}>
              S/ {Math.abs(utilidadNeta).toFixed(2)}
            </span>
          </div>
        </div>

        {/* ACCIONES DE CIERRE */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          {cierreEjecutado ? (
            <div className="callout callout--success" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
              <div>
                <strong>¡Cierre Contable Anual Concluido con Éxito!</strong>
                <div style={{ marginTop: '4px' }}>
                  • Se generó el voucher <strong>VOU-12-CIERRE</strong> volteando todas las cuentas de gestión a 0.
                </div>
                <div>
                  • Se generó el voucher <strong>VOU-01-APERTURA-2027</strong> aperturando el nuevo ejercicio con los saldos activos de Bancos (10) y Activos.
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                Al presionar el botón de cierre, el software genera automáticamente el asiento de refundición de cuentas y el asiento de apertura del 2027.
              </div>
              <button 
                className="btn btn--primary" 
                style={{ padding: '10px 24px', fontSize: '14px', backgroundColor: '#0F172A' }}
                onClick={ejecutarCierreContable}
              >
                <LockKeyhole size={16} /> Ejecutar Cierre Contable de Ejercicio 2026
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
