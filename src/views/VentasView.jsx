import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { TrendingUp, Plus, Search, Clock, Zap, CheckCircle2 } from 'lucide-react';

export const VentasView = () => {
  const { ventas, registrarVenta, bancos, plantillas } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario único de ventas
  const [form, setForm] = useState({
    ruc: '',
    razonSocial: '',
    serieNumero: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    plantillaCodigo: 'VENTA_SERVICIOS_TURISTICOS',
    total: '',
    modalidad: 'CREDITO', // 'CREDITO' o 'CONTADO'
    bancoCobro: 'BCP_SOLES'
  });

  const totalNum = parseFloat(form.total) || 0;
  const subtotalCalc = totalNum > 0 ? (totalNum / 1.18).toFixed(2) : '0.00';
  const igvCalc = totalNum > 0 ? (totalNum - parseFloat(subtotalCalc)).toFixed(2) : '0.00';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ruc || !form.serieNumero || totalNum <= 0) return;

    registrarVenta({
      ...form,
      total: totalNum
    });

    setIsModalOpen(false);
    setForm({
      ruc: '',
      razonSocial: '',
      serieNumero: '',
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      plantillaCodigo: 'VENTA_SERVICIOS_TURISTICOS',
      total: '',
      modalidad: 'CREDITO',
      bancoCobro: 'BCP_SOLES'
    });
  };

  const plantillasVentas = plantillas.filter(p => p.tipoOperacion === 'VENTA');

  const filteredVentas = ventas.filter(v => 
    v.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.ruc.includes(searchTerm) ||
    v.serieNumero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVentasMonto = ventas.reduce((acc, v) => acc + v.total, 0);
  const totalPendienteCobro = ventas.filter(v => v.estadoCobro === 'PENDIENTE').reduce((acc, v) => acc + v.saldoPendiente, 0);

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Facturación" 
          value={`S/ ${totalVentasMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Comprobantes emitidos en el mes" 
          badgeText={`${ventas.length} Facturas`} 
          badgeType="info" 
        />
        <MetricCard 
          title="Débito Fiscal IGV (18%)" 
          value={`S/ ${(totalVentasMonto - (totalVentasMonto / 1.18)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Impuesto cobrado al cliente" 
          badgeText="Cta 4011" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Por Cobrar a Clientes" 
          value={`S/ ${totalPendienteCobro.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Cuentas por cobrar exigibles" 
          badgeText="Cta 1212" 
          badgeType="danger" 
        />
        <MetricCard 
          title="Cobrado en Bancos" 
          value={`S/ ${(totalVentasMonto - totalPendienteCobro).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Ingresado a cuentas de tesorería" 
          badgeText="Recaudado" 
          badgeType="success" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por Cliente, RUC o N° Factura..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> Registrar Factura de Venta
          <span className="btn__badge">F2</span>
        </button>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Fecha</th>
              <th style={{ width: '120px' }}>Comprobante</th>
              <th>Cliente / RUC</th>
              <th>Concepto Facturado</th>
              <th className="text-right" style={{ width: '90px' }}>Subtotal</th>
              <th className="text-right" style={{ width: '90px' }}>IGV (18%)</th>
              <th className="text-right" style={{ width: '110px' }}>Total (S/.)</th>
              <th style={{ width: '90px' }} className="text-center">Modalidad</th>
              <th style={{ width: '100px' }} className="text-center">Estado Cobro</th>
              <th style={{ width: '110px' }} className="mono">Voucher(s)</th>
            </tr>
          </thead>
          <tbody>
            {filteredVentas.map((v) => (
              <tr key={v.id}>
                <td className="mono text-muted">{v.fecha}</td>
                <td className="mono font-bold" style={{ color: '#10B981' }}>{v.serieNumero}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{v.razonSocial}</div>
                  <div className="mono" style={{ fontSize: '11px', color: '#64748B' }}>RUC: {v.ruc}</div>
                </td>
                <td style={{ fontSize: '12px', color: '#475569' }}>{v.concepto}</td>
                <td className="mono text-right">S/ {v.subtotal.toFixed(2)}</td>
                <td className="mono text-right" style={{ color: '#F59E0B' }}>S/ {v.igv.toFixed(2)}</td>
                <td className="mono text-right font-bold">S/ {v.total.toFixed(2)}</td>
                <td className="text-center">
                  <span className={`badge badge--${v.modalidad === 'CONTADO' ? 'success' : 'neutral'}`}>
                    {v.modalidad}
                  </span>
                </td>
                <td className="text-center">
                  <span className={`badge badge--${v.estadoCobro === 'COBRADO' ? 'success' : 'danger'}`}>
                    {v.estadoCobro === 'COBRADO' ? 'Cobrado' : 'Pendiente'}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  <div>{v.voucherProvision}</div>
                  {v.voucherCobro && (
                    <div style={{ color: '#2563EB', fontSize: '10px' }}>+ {v.voucherCobro}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL REGISTRAR VENTA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Factura de Venta (Gestión Clientes)"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSubmit}>
              Contabilizar Venta
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--info">
            Ingrese los datos de la venta emitida. El sistema generará el crédito fiscal por pagar (Cta 4011) y el ingreso (Cta 70) correspondiente.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">RUC o DNI Cliente</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="20610000000" 
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">Razón Social / Nombre</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="CLIENTE S.A.C." 
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">Serie y Número</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="F001-0005678" 
                value={form.serieNumero}
                onChange={(e) => setForm({ ...form, serieNumero: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Emisión</label>
              <input 
                type="date" 
                className="form-control form-control--mono" 
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Plantilla Contable</label>
            <select 
              className="form-control"
              value={form.plantillaCodigo}
              onChange={(e) => setForm({ ...form, plantillaCodigo: e.target.value })}
            >
              {plantillasVentas.map(p => (
                <option key={p.codigo} value={p.codigo}>{p.nombre} ({p.codigo})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Concepto Facturado</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Descripción del servicio o producto..." 
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            />
          </div>

          {/* CÁLCULO DE IMPORTES */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '6px', border: '1px solid #E2E8F0', margin: '14px 0' }}>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label form-label--required" style={{ color: '#10B981', fontWeight: 700 }}>
                Precio Total Venta (S/.)
              </label>
              <input 
                type="number" 
                step="0.01" 
                className="form-control form-control--mono" 
                placeholder="0.00" 
                style={{ fontSize: '16px', fontWeight: 700 }}
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Subtotal (Base Imponible / 1.18)</div>
                <div className="mono font-bold" style={{ fontSize: '15px' }}>S/ {subtotalCalc}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#F59E0B' }}>IGV Débito Fiscal (18%)</div>
                <div className="mono font-bold" style={{ fontSize: '15px', color: '#F59E0B' }}>S/ {igvCalc}</div>
              </div>
            </div>
          </div>

          {/* CONDICIÓN DE COBRO */}
          <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
            CONDICIÓN Y MODALIDAD DE COBRO
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <button
              type="button"
              className={`btn ${form.modalidad === 'CREDITO' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ justifyContent: 'center' }}
              onClick={() => setForm({ ...form, modalidad: 'CREDITO' })}
            >
              <Clock size={14} /> A Crédito (1 Asiento Provisión 12/70/40)
            </button>
            <button
              type="button"
              className={`btn ${form.modalidad === 'CONTADO' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ justifyContent: 'center' }}
              onClick={() => setForm({ ...form, modalidad: 'CONTADO' })}
            >
              <Zap size={14} /> Al Contado (2 Asientos: Venta + Cobro 104)
            </button>
          </div>

          {form.modalidad === 'CONTADO' && (
            <div className="form-group" style={{ backgroundColor: '#ECFDF5', padding: '10px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
              <label className="form-label form-label--required" style={{ color: '#047857' }}>
                Seleccione Banco Receptor del Cobro
              </label>
              <select 
                className="form-control"
                value={form.bancoCobro}
                onChange={(e) => setForm({ ...form, bancoCobro: e.target.value })}
              >
                {bancos.map(b => (
                  <option key={b.alias} value={b.alias}>
                    {b.alias} — {b.nombreBanco} (Saldo: S/ {b.saldoLibros.toFixed(2)})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                * El sistema generará el asiento de venta y el cobro ingresando fondos a {form.bancoCobro} cancelando la Cta 12.
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
