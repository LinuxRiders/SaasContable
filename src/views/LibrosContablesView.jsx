import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Scale, BookOpen, Search, Filter, Printer, Download, Eye } from 'lucide-react';

export const LibrosContablesView = () => {
  const { vouchers, planContable } = useAccounting();
  const [subTab, setSubTab] = useState('MAYOR'); // 'MAYOR', 'DIARIO', 'BALANCE'
  const [cuentaMayorSeleccionada, setCuentaMayorSeleccionada] = useState('104101');
  const [searchTerm, setSearchTerm] = useState('');

  // Cuentas disponibles para el Mayor
  const cuentasDisponibles = planContable.filter(c => c.esCuentaU);

  // Filtrar movimientos para el Mayor Auxiliar de la cuenta seleccionada
  const cuentaObj = planContable.find(c => c.codigo === cuentaMayorSeleccionada);
  const saldoInicial = cuentaObj ? (cuentaObj.saldoDeudor - cuentaObj.saldoAcreedor) : 0;

  // Extraer todas las líneas asociadas a esta cuenta en todos los vouchers
  const movimientosCuenta = [];
  vouchers.forEach(v => {
    v.lineas.forEach(l => {
      if (l.cta === cuentaMayorSeleccionada) {
        movimientosCuenta.push({
          id: `${v.id}-${l.cta}-${Math.random()}`,
          fecha: v.fecha,
          voucher: v.numero,
          subdiario: v.subdiario,
          docRef: v.docRef || '—',
          glosa: v.glosa,
          debe: l.debe,
          haber: l.haber
        });
      }
    });
  });

  // Calcular totales del Mayor
  const totalDebe = movimientosCuenta.reduce((acc, m) => acc + m.debe, 0);
  const totalHaber = movimientosCuenta.reduce((acc, m) => acc + m.haber, 0);
  const saldoActual = saldoInicial + totalDebe - totalHaber;

  // Correr saldo fila por fila
  let saldoAcumulado = saldoInicial;
  const movimientosConSaldo = movimientosCuenta.map(m => {
    saldoAcumulado = saldoAcumulado + m.debe - m.haber;
    return {
      ...m,
      saldoCorriente: saldoAcumulado
    };
  });

  // Totales de Libro Diario
  let diarioTotalDebe = 0;
  let diarioTotalHaber = 0;
  vouchers.forEach(v => {
    v.lineas.forEach(l => {
      diarioTotalDebe += l.debe;
      diarioTotalHaber += l.haber;
    });
  });

  return (
    <div className="content-body">
      {/* METRICAS GENERALES */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Asientos en Diario" 
          value={vouchers.length} 
          subtext="Vouchers procesados" 
          badgeText="Correlativo" 
          badgeType="info" 
        />
        <MetricCard 
          title="Suma Total Débitos (Debe)" 
          value={`S/ ${diarioTotalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Total cargos del ejercicio" 
          badgeText="Debe" 
          badgeType="success" 
        />
        <MetricCard 
          title="Suma Total Créditos (Haber)" 
          value={`S/ ${diarioTotalHaber.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Total abonos del ejercicio" 
          badgeText="Haber" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Diferencia de Balance" 
          value={`S/ ${Math.abs(diarioTotalDebe - diarioTotalHaber).toFixed(2)}`} 
          subtext="Partida Doble Cuadrada" 
          badgeText="Equilibrado" 
          badgeType="success" 
        />
      </div>

      {/* TABS DE LIBROS */}
      <div className="tabs-bar">
        <button 
          className={`tab-btn ${subTab === 'MAYOR' ? 'tab-btn--active' : ''}`}
          onClick={() => setSubTab('MAYOR')}
        >
          <BookOpen size={14} style={{ display: 'inline', marginRight: 4 }} />
          Consulta de Movimientos — Mayor Auxiliar
        </button>
        <button 
          className={`tab-btn ${subTab === 'DIARIO' ? 'tab-btn--active' : ''}`}
          onClick={() => setSubTab('DIARIO')}
        >
          <Scale size={14} style={{ display: 'inline', marginRight: 4 }} />
          Libro Diario General
        </button>
        <button 
          className={`tab-btn ${subTab === 'BALANCE' ? 'tab-btn--active' : ''}`}
          onClick={() => setSubTab('BALANCE')}
        >
          Balance de Comprobación
        </button>
      </div>

      {/* VISTA 1: MAYOR AUXILIAR (RÉPLICA FIGMA 118-2732) */}
      {subTab === 'MAYOR' && (
        <div>
          {/* BARRA DE SELECCIÓN DE CUENTA */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            padding: '14px 18px', 
            borderRadius: '8px', 
            border: '1px solid #E2E8F0', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <label className="form-label" style={{ marginBottom: 4 }}>Seleccionar Cuenta Contable:</label>
              <select 
                className="form-control form-control--mono"
                value={cuentaMayorSeleccionada}
                onChange={(e) => setCuentaMayorSeleccionada(e.target.value)}
              >
                {cuentasDisponibles.map(c => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} — {c.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
              <button className="btn btn--secondary btn--sm">
                <Printer size={13} /> Imprimir Mayor
              </button>
              <button className="btn btn--secondary btn--sm">
                <Download size={13} /> Exportar Excel
              </button>
            </div>
          </div>

          {/* CUADROS KPI DEL MAYOR (IDÉNTICO A FIGMA 118-2732) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>SALDO INICIAL</span>
                <span className="badge badge--neutral" style={{ fontSize: '10px' }}>Deudor</span>
              </div>
              <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px', color: '#0F172A' }}>
                S/ {saldoInicial.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Al 01/09/2026</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>TOTAL DEBE (+)</span>
                <span className="badge badge--success" style={{ fontSize: '10px' }}>Cargos</span>
              </div>
              <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px', color: '#10B981' }}>
                S/ {totalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{movimientosCuenta.length} apuntes</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>TOTAL HABER (-)</span>
                <span className="badge badge--warning" style={{ fontSize: '10px' }}>Abonos</span>
              </div>
              <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px', color: '#EF4444' }}>
                S/ {totalHaber.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Salidas registradas</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>SALDO ACTUAL</span>
                <span className="badge badge--info" style={{ fontSize: '10px' }}>Actualizado</span>
              </div>
              <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px', color: '#2563EB' }}>
                S/ {saldoActual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#10B981' }}>Saldo Deudor Neto</div>
            </div>
          </div>

          {/* TABLA DE MOVIMIENTOS DEL MAYOR AUXILIAR */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '95px' }}>Fecha</th>
                  <th style={{ width: '110px' }} className="mono">N° Voucher</th>
                  <th style={{ width: '130px' }}>Subdiario</th>
                  <th style={{ width: '110px' }} className="mono">Doc. Ref.</th>
                  <th>Glosa / Concepto del Asiento</th>
                  <th className="text-right" style={{ width: '110px' }}>Debe (S/.)</th>
                  <th className="text-right" style={{ width: '110px' }}>Haber (S/.)</th>
                  <th className="text-right" style={{ width: '120px' }}>Saldo (S/.)</th>
                </tr>
              </thead>
              <tbody>
                {movimientosConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center" style={{ padding: '30px', color: '#64748B' }}>
                      No se registran movimientos para esta cuenta en el período.
                    </td>
                  </tr>
                ) : (
                  movimientosConSaldo.map(m => (
                    <tr key={m.id}>
                      <td className="mono text-muted">{m.fecha}</td>
                      <td className="mono font-bold" style={{ color: '#2563EB' }}>{m.voucher}</td>
                      <td style={{ fontSize: '11.5px' }}>{m.subdiario}</td>
                      <td className="mono text-muted">{m.docRef}</td>
                      <td style={{ fontSize: '12px' }}>{m.glosa}</td>
                      <td className="mono text-right" style={{ color: m.debe > 0 ? '#10B981' : '#94A3B8', fontWeight: m.debe > 0 ? 600 : 400 }}>
                        {m.debe > 0 ? m.debe.toFixed(2) : '0.00'}
                      </td>
                      <td className="mono text-right" style={{ color: m.haber > 0 ? '#EF4444' : '#94A3B8', fontWeight: m.haber > 0 ? 600 : 400 }}>
                        {m.haber > 0 ? m.haber.toFixed(2) : '0.00'}
                      </td>
                      <td className="mono text-right font-bold" style={{ color: '#0F172A' }}>
                        {m.saldoCorriente.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 700 }}>
                  <td colSpan={5} className="text-right" style={{ textTransform: 'uppercase', fontSize: '11.5px', color: '#475569' }}>
                    TOTALES DEL PERÍODO:
                  </td>
                  <td className="mono text-right" style={{ color: '#10B981', fontSize: '13px' }}>
                    S/ {totalDebe.toFixed(2)}
                  </td>
                  <td className="mono text-right" style={{ color: '#EF4444', fontSize: '13px' }}>
                    S/ {totalHaber.toFixed(2)}
                  </td>
                  <td className="mono text-right font-bold" style={{ color: '#2563EB', fontSize: '13px' }}>
                    S/ {saldoActual.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: LIBRO DIARIO GENERAL */}
      {subTab === 'DIARIO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {vouchers.map(v => (
            <div 
              key={v.id} 
              style={{ 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E2E8F0', 
                borderRadius: '8px', 
                overflow: 'hidden',
                boxShadow: 'var(--shadow-xs)' 
              }}
            >
              <div style={{ 
                backgroundColor: '#F8FAFC', 
                padding: '10px 16px', 
                borderBottom: '1px solid #E2E8F0', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="mono font-bold" style={{ color: '#2563EB', fontSize: '13px' }}>
                    {v.numero}
                  </span>
                  <span className="badge badge--info" style={{ fontSize: '10px' }}>
                    {v.subdiario}
                  </span>
                  <span className="mono text-muted" style={{ fontSize: '12px' }}>
                    Fecha: {v.fecha}
                  </span>
                  {v.docRef && (
                    <span className="mono text-muted" style={{ fontSize: '11.5px' }}>
                      Doc: {v.docRef}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  {v.entidadNombre} ({v.entidadRuc})
                </div>
              </div>

              <div style={{ padding: '10px 16px', fontSize: '12px', color: '#64748B', fontStyle: 'italic', borderBottom: '1px solid #F1F5F9' }}>
                Glosa: {v.glosa}
              </div>

              <table className="data-table" style={{ border: 'none' }}>
                <thead>
                  <tr style={{ background: '#FFFFFF' }}>
                    <th style={{ width: '120px' }}>Cuenta</th>
                    <th>Descripción de Cuenta</th>
                    <th style={{ width: '110px' }}>C. Costo</th>
                    <th className="text-right" style={{ width: '120px' }}>Debe (S/.)</th>
                    <th className="text-right" style={{ width: '120px' }}>Haber (S/.)</th>
                  </tr>
                </thead>
                <tbody>
                  {v.lineas.map((l, i) => (
                    <tr key={i}>
                      <td className="mono font-bold" style={{ color: '#2563EB' }}>{l.cta}</td>
                      <td>{l.desc}</td>
                      <td className="mono text-muted">{l.cc || '—'}</td>
                      <td className="mono text-right" style={{ color: l.debe > 0 ? '#10B981' : '#94A3B8' }}>
                        {l.debe > 0 ? l.debe.toFixed(2) : '0.00'}
                      </td>
                      <td className="mono text-right" style={{ color: l.haber > 0 ? '#EF4444' : '#94A3B8' }}>
                        {l.haber > 0 ? l.haber.toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 3: BALANCE DE COMPROBACIÓN */}
      {subTab === 'BALANCE' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Código</th>
                <th>Denominación de Cuenta</th>
                <th className="text-right" style={{ width: '120px' }}>Sumas Debe</th>
                <th className="text-right" style={{ width: '120px' }}>Sumas Haber</th>
                <th className="text-right" style={{ width: '120px' }}>Saldo Deudor</th>
                <th className="text-right" style={{ width: '120px' }}>Saldo Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {cuentasDisponibles.map(c => {
                // Sumas de esta cuenta en vouchers
                let d = 0;
                let h = 0;
                vouchers.forEach(v => {
                  v.lineas.forEach(l => {
                    if (l.cta === c.codigo) {
                      d += l.debe;
                      h += l.haber;
                    }
                  });
                });

                d += c.saldoDeudor;
                h += c.saldoAcreedor;

                const saldoD = d > h ? d - h : 0;
                const saldoH = h > d ? h - d : 0;

                return (
                  <tr key={c.codigo}>
                    <td className="mono font-bold">{c.codigo}</td>
                    <td>{c.descripcion}</td>
                    <td className="mono text-right">{d.toFixed(2)}</td>
                    <td className="mono text-right">{h.toFixed(2)}</td>
                    <td className="mono text-right font-bold" style={{ color: '#10B981' }}>{saldoD.toFixed(2)}</td>
                    <td className="mono text-right font-bold" style={{ color: '#EF4444' }}>{saldoH.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
