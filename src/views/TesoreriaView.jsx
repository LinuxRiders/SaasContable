import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { Wallet, Landmark, ArrowUpRight, ArrowDownLeft, Plus, Trash2, CheckCircle } from 'lucide-react';

export const TesoreriaView = () => {
  const { 
    compras, 
    ventas, 
    bancos, 
    pagarFacturaPendiente, 
    cobrarFacturaPendiente 
  } = useAccounting();

  const [activeTab, setActiveTab] = useState('PAGAR'); // 'PAGAR' o 'COBRAR'
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [isModalCobroOpen, setIsModalCobroOpen] = useState(false);

  // Estado para pagos multi-banco: [{ bancoAlias: 'BCP_SOLES', monto: 0 }]
  const [filasPagoMultiBanco, setFilasPagoMultiBanco] = useState([
    { bancoAlias: 'BCP_SOLES', monto: '' }
  ]);

  // Estado para cobro simple
  const [bancoCobroAlias, setBancoCobroAlias] = useState('BCP_SOLES');

  const facturasPendientesPago = compras.filter(c => c.estadoPago === 'PENDIENTE');
  const facturasPendientesCobro = ventas.filter(v => v.estadoCobro === 'PENDIENTE');

  const handleOpenModalPago = (factura) => {
    setSelectedFactura(factura);
    setFilasPagoMultiBanco([
      { bancoAlias: 'BCP_SOLES', monto: factura.saldoPendiente.toString() }
    ]);
    setIsModalPagoOpen(true);
  };

  const handleOpenModalCobro = (factura) => {
    setSelectedFactura(factura);
    setBancoCobroAlias('BCP_SOLES');
    setIsModalCobroOpen(true);
  };

  const handleAddFilaBanco = () => {
    setFilasPagoMultiBanco(prev => [...prev, { bancoAlias: 'INTERBANK_SOLES', monto: '' }]);
  };

  const handleRemoveFilaBanco = (index) => {
    if (filasPagoMultiBanco.length <= 1) return;
    setFilasPagoMultiBanco(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFilaBanco = (index, field, value) => {
    setFilasPagoMultiBanco(prev => prev.map((fila, i) => i === index ? { ...fila, [field]: value } : fila));
  };

  const totalSumaPagos = filasPagoMultiBanco.reduce((acc, f) => acc + (parseFloat(f.monto) || 0), 0);
  const diferenciaPago = selectedFactura ? (selectedFactura.saldoPendiente - totalSumaPagos).toFixed(2) : 0;

  const handleConfirmarPago = (e) => {
    e.preventDefault();
    if (!selectedFactura || totalSumaPagos <= 0) return;

    pagarFacturaPendiente(selectedFactura.id, filasPagoMultiBanco);
    setIsModalPagoOpen(false);
  };

  const handleConfirmarCobro = (e) => {
    e.preventDefault();
    if (!selectedFactura) return;

    cobrarFacturaPendiente(selectedFactura.id, bancoCobroAlias, selectedFactura.saldoPendiente);
    setIsModalCobroOpen(false);
  };

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Facturas por Pagar (CxP)" 
          value={facturasPendientesPago.length} 
          subtext={`S/ ${facturasPendientesPago.reduce((acc, f) => acc + f.saldoPendiente, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          badgeText="Pendientes" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Facturas por Cobrar (CxC)" 
          value={facturasPendientesCobro.length} 
          subtext={`S/ ${facturasPendientesCobro.reduce((acc, f) => acc + f.saldoPendiente, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          badgeText="Por Recaudar" 
          badgeType="info" 
        />
        <MetricCard 
          title="Disponibilidad en Bancos" 
          value={`S/ ${bancos.reduce((acc, b) => acc + b.saldoLibros, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Saldo total combinado" 
          badgeText="Liquidez" 
          badgeType="success" 
        />
        <MetricCard 
          title="Regla de Tesorería" 
          value="OBLIGATORIA" 
          subtext="No permite dinero fantasma" 
          badgeText="Control SoD" 
          badgeType="neutral" 
        />
      </div>

      {/* TABS DE SELECCIÓN */}
      <div className="tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'PAGAR' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('PAGAR')}
        >
          <ArrowUpRight size={14} style={{ display: 'inline', marginRight: 4 }} />
          Cuentas por Pagar (Proveedores) — {facturasPendientesPago.length} Pendientes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'COBRAR' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('COBRAR')}
        >
          <ArrowDownLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
          Cuentas por Cobrar (Clientes) — {facturasPendientesCobro.length} Pendientes
        </button>
      </div>

      {/* TABLA SEGÚN TAB ACTIVO */}
      {activeTab === 'PAGAR' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Fecha</th>
                <th style={{ width: '120px' }}>Comprobante</th>
                <th>Proveedor</th>
                <th>Concepto</th>
                <th className="text-right" style={{ width: '110px' }}>Total Factura</th>
                <th className="text-right" style={{ width: '110px' }}>Saldo por Pagar</th>
                <th style={{ width: '130px' }} className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {facturasPendientesPago.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '30px', color: '#64748B' }}>
                    No hay facturas pendientes de pago a crédito.
                  </td>
                </tr>
              ) : (
                facturasPendientesPago.map(f => (
                  <tr key={f.id}>
                    <td className="mono text-muted">{f.fecha}</td>
                    <td className="mono font-bold" style={{ color: '#2563EB' }}>{f.serieNumero}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.razonSocial}</div>
                      <div className="mono" style={{ fontSize: '11px', color: '#64748B' }}>RUC: {f.ruc}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{f.concepto}</td>
                    <td className="mono text-right">S/ {f.total.toFixed(2)}</td>
                    <td className="mono text-right font-bold" style={{ color: '#EF4444' }}>
                      S/ {f.saldoPendiente.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn btn--primary btn--sm" 
                        onClick={() => handleOpenModalPago(f)}
                      >
                        Pagar Deuda
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Fecha</th>
                <th style={{ width: '120px' }}>Comprobante</th>
                <th>Cliente</th>
                <th>Concepto</th>
                <th className="text-right" style={{ width: '110px' }}>Total Factura</th>
                <th className="text-right" style={{ width: '110px' }}>Saldo por Cobrar</th>
                <th style={{ width: '130px' }} className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {facturasPendientesCobro.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '30px', color: '#64748B' }}>
                    No hay facturas pendientes de cobro a clientes.
                  </td>
                </tr>
              ) : (
                facturasPendientesCobro.map(f => (
                  <tr key={f.id}>
                    <td className="mono text-muted">{f.fecha}</td>
                    <td className="mono font-bold" style={{ color: '#10B981' }}>{f.serieNumero}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.razonSocial}</div>
                      <div className="mono" style={{ fontSize: '11px', color: '#64748B' }}>RUC: {f.ruc}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{f.concepto}</td>
                    <td className="mono text-right">S/ {f.total.toFixed(2)}</td>
                    <td className="mono text-right font-bold" style={{ color: '#2563EB' }}>
                      S/ {f.saldoPendiente.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn btn--success btn--sm" 
                        onClick={() => handleOpenModalCobro(f)}
                      >
                        Cobrar Factura
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PAGO MULTI-BANCO (PANTALLA MOVIMIENTOS FINANCIEROS) */}
      <Modal
        isOpen={isModalPagoOpen}
        onClose={() => setIsModalPagoOpen(false)}
        title={`Desembolso / Pago de Factura ${selectedFactura?.serieNumero}`}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalPagoOpen(false)}>Cancelar</button>
            <button 
              className="btn btn--primary" 
              onClick={handleConfirmarPago}
              disabled={parseFloat(diferenciaPago) !== 0}
            >
              Generar Asiento de Pago y Descontar Bancos
            </button>
          </>
        }
      >
        {selectedFactura && (
          <form onSubmit={handleConfirmarPago}>
            <div className="callout callout--info">
              <strong>Flexibilidad Multi-Banco:</strong> Puede pagar la totalidad de la deuda dividiendo el monto entre varias cuentas bancarias (ej. BCP e Interbank). Matará la deuda en el Debe (42) abriendo varias filas en el Haber (104).
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748B' }}>Proveedor:</span>
                <strong>{selectedFactura.razonSocial} ({selectedFactura.ruc})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748B' }}>Documento:</span>
                <span className="mono font-bold">{selectedFactura.serieNumero}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Saldo Total a Liquidar:</span>
                <span className="mono font-bold" style={{ color: '#EF4444', fontSize: '15px' }}>
                  S/ {selectedFactura.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
              DISTRIBUCIÓN DEL DESEMBOLSO EN BANCOS:
            </div>

            {filasPagoMultiBanco.map((fila, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select 
                  className="form-control"
                  style={{ flex: 1 }}
                  value={fila.bancoAlias}
                  onChange={(e) => handleUpdateFilaBanco(idx, 'bancoAlias', e.target.value)}
                >
                  {bancos.map(b => (
                    <option key={b.alias} value={b.alias}>
                      {b.alias} (Disp: S/ {b.saldoLibros.toFixed(2)})
                    </option>
                  ))}
                </select>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control form-control--mono" 
                  style={{ width: '150px' }}
                  placeholder="Monto S/." 
                  value={fila.monto}
                  onChange={(e) => handleUpdateFilaBanco(idx, 'monto', e.target.value)}
                  required
                />
                {filasPagoMultiBanco.length > 1 && (
                  <button 
                    type="button" 
                    className="btn btn--secondary btn--sm" 
                    style={{ color: '#EF4444', padding: '6px' }}
                    onClick={() => handleRemoveFilaBanco(idx)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button 
              type="button" 
              className="btn btn--secondary btn--sm" 
              style={{ marginTop: '4px', marginBottom: '14px' }}
              onClick={handleAddFilaBanco}
            >
              <Plus size={13} /> + Agregar Otra Cuenta Bancaria
            </button>

            {/* BALANCE DEL PAGO */}
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '6px', 
              backgroundColor: parseFloat(diferenciaPago) === 0 ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${parseFloat(diferenciaPago) === 0 ? '#A7F3D0' : '#FECACA'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Total Asignado a Bancos:</div>
                <div className="mono font-bold" style={{ fontSize: '14px' }}>S/ {totalSumaPagos.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Diferencia / Descuadre:</div>
                <div className="mono font-bold" style={{ fontSize: '14px', color: parseFloat(diferenciaPago) === 0 ? '#10B981' : '#EF4444' }}>
                  S/ {diferenciaPago} {parseFloat(diferenciaPago) === 0 ? '(Cuadrado)' : ''}
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL COBRO FACTURA */}
      <Modal
        isOpen={isModalCobroOpen}
        onClose={() => setIsModalCobroOpen(false)}
        title={`Cobro / Recaudo Factura ${selectedFactura?.serieNumero}`}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalCobroOpen(false)}>Cancelar</button>
            <button className="btn btn--success" onClick={handleConfirmarCobro}>
              Confirmar Cobro en Banco
            </button>
          </>
        }
      >
        {selectedFactura && (
          <form onSubmit={handleConfirmarCobro}>
            <div className="callout callout--info">
              Seleccione la cuenta bancaria de destino donde se depositaron los fondos de la factura.
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748B' }}>Cliente:</span>
                <strong>{selectedFactura.razonSocial} ({selectedFactura.ruc})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total por Cobrar:</span>
                <span className="mono font-bold" style={{ color: '#10B981', fontSize: '15px' }}>
                  S/ {selectedFactura.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">Cuenta Bancaria de Destino</label>
              <select 
                className="form-control"
                value={bancoCobroAlias}
                onChange={(e) => setBancoCobroAlias(e.target.value)}
              >
                {bancos.map(b => (
                  <option key={b.alias} value={b.alias}>
                    {b.alias} — {b.nombreBanco} (Saldo actual: S/ {b.saldoLibros.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
