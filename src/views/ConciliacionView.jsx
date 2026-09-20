import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { FileCheck, Wand2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ConciliacionView = () => {
  const { 
    bancos, 
    partidasExtracto, 
    autoconciliarPartidas, 
    generarAjusteGMF 
  } = useAccounting();

  const bancoBCP = bancos.find(b => b.alias === 'BCP_SOLES') || bancos[0];

  const totalExtracto = partidasExtracto.reduce((acc, p) => acc + p.valorExtracto, 0);
  const totalLibros = partidasExtracto.reduce((acc, p) => acc + p.valorLibros, 0);
  const diferenciaAjustar = Math.abs(totalExtracto - totalLibros);

  return (
    <div className="content-body">
      {/* CUADRO PRINCIPAL DE CUENTA CONCILIADA (FIGMA 58-654) */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E2E8F0', 
        borderRadius: '8px', 
        padding: '18px 22px', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            CUENTA CONTABLE PRINCIPAL
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
            {bancoBCP.codigoContable} — {bancoBCP.nombreCuentaContable} ({bancoBCP.alias})
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            N° Cuenta: {bancoBCP.numeroCuenta} | Período: SETIEMBRE_2026
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase' }}>SALDO EXTRACTO</div>
            <div className="mono font-bold" style={{ fontSize: '18px', color: '#0F172A' }}>
              S/ {bancoBCP.saldoExtracto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase' }}>SALDO EN LIBROS</div>
            <div className="mono font-bold" style={{ fontSize: '18px', color: '#10B981' }}>
              S/ {bancoBCP.saldoLibros.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ 
            backgroundColor: diferenciaAjustar > 0 ? '#FFFBEB' : '#ECFDF5', 
            padding: '8px 14px', 
            borderRadius: '6px', 
            border: `1px solid ${diferenciaAjustar > 0 ? '#FDE68A' : '#A7F3D0'}` 
          }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: diferenciaAjustar > 0 ? '#B45309' : '#047857', textTransform: 'uppercase' }}>
              DIFERENCIA POR AJUSTAR
            </div>
            <div className="mono font-bold" style={{ fontSize: '16px', color: diferenciaAjustar > 0 ? '#B45309' : '#047857' }}>
              S/ {diferenciaAjustar.toFixed(2)} {diferenciaAjustar > 0 ? '(GMF / No Registrado)' : '(Conciliado)'}
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
          PARTIDAS DEL EXTRACTO VS REGISTROS CONTABLES
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--secondary" onClick={autoconciliarPartidas}>
          <Wand2 size={13} color="#2563EB" /> Autoconciliar mediante Reglas
        </button>
      </div>

      {/* TABLA DE PARTIDAS (FIGMA 58-654) */}
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Fecha Mov.</th>
              <th>Referencia / Concepto Extracto Bancario</th>
              <th className="text-right" style={{ width: '130px' }}>Valor Extracto (S/.)</th>
              <th className="text-right" style={{ width: '130px' }}>Valor en Libros (S/.)</th>
              <th style={{ width: '120px' }} className="text-center">Estado</th>
              <th style={{ width: '140px' }} className="text-center">Acción Sugerida</th>
            </tr>
          </thead>
          <tbody>
            {partidasExtracto.map(p => (
              <tr key={p.id}>
                <td className="mono text-muted">{p.fecha}</td>
                <td>{p.referencia}</td>
                <td className="mono text-right font-bold" style={{ color: p.valorExtracto >= 0 ? '#10B981' : '#EF4444' }}>
                  {p.valorExtracto >= 0 ? `+${p.valorExtracto.toFixed(2)}` : p.valorExtracto.toFixed(2)}
                </td>
                <td className="mono text-right" style={{ color: '#475569' }}>
                  {p.valorLibros !== 0 ? (p.valorLibros >= 0 ? `+${p.valorLibros.toFixed(2)}` : p.valorLibros.toFixed(2)) : '0.00'}
                </td>
                <td className="text-center">
                  <span className={`badge badge--${p.estado === 'CONCILIADO' ? 'success' : 'warning'}`}>
                    {p.estado === 'CONCILIADO' ? 'Conciliado' : 'Pendiente Libro'}
                  </span>
                </td>
                <td className="text-center">
                  {p.estado === 'CONCILIADO' ? (
                    <span style={{ color: '#10B981', fontSize: '11.5px', fontWeight: 600 }}>
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 3 }} /> OK
                    </span>
                  ) : (
                    <button 
                      className="btn btn--danger btn--sm" 
                      onClick={() => generarAjusteGMF(p.id)}
                    >
                      Generar Asiento Ajuste
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN INFERIOR: HISTORIAL DE APROBACIONES Y CIERRE BANCARIO (FIGMA 58-654) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>
            HISTORIAL Y CONTROL DE APROBACIONES DE EGRESO
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '6px' }}>
              <div>
                <strong>Auxiliar Contable:</strong> M. Albarracín
              </div>
              <span className="badge badge--neutral">PREPARADO 24/Set 09:12</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '6px' }}>
              <div>
                <strong>Contador General:</strong> L. Giraldo
              </div>
              <span className="badge badge--info">REVISADO Y FIRMADO 24/Set 10:00</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ECFDF5', borderRadius: '6px' }}>
              <div>
                <strong>Revisor Fiscal:</strong> A. Restrepo
              </div>
              <span className="badge badge--success">APROBADO PARA DESEMBOLSO [✓]</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
            CIERRE DE PERÍODO BANCARIO
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '14px', lineHeight: '1.4' }}>
            Una vez conciliadas todas las partidas y ajustado el GMF, puede bloquear los registros bancarios para este período.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn--secondary btn--sm" style={{ width: '100%' }}>
              Emitir Reporte Oficial de Conciliación
            </button>
            <button className="btn btn--primary btn--sm" style={{ width: '100%', backgroundColor: '#0F172A' }}>
              Cerrar y Bloquear Conciliación Bancaria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
