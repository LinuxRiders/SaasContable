import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { ShoppingCart, Plus, Search, CheckCircle2, Clock, ArrowRight, Zap } from 'lucide-react';

export const ComprasView = () => {
  const { compras, registrarCompra, bancos, plantillas } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario único de compras
  const [form, setForm] = useState({
    ruc: '',
    razonSocial: '',
    serieNumero: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    plantillaCodigo: 'COMPRA_MERCADERIA',
    total: '',
    modalidad: 'CREDITO', // 'CREDITO' o 'CONTADO'
    bancoPago: 'BCP_SOLES',
    centroCostos: 'CC-ADMIN'
  });

  // Cálculo en vivo de Subtotal e IGV al tipear el Total
  const totalNum = parseFloat(form.total) || 0;
  const subtotalCalc = totalNum > 0 ? (totalNum / 1.18).toFixed(2) : '0.00';
  const igvCalc = totalNum > 0 ? (totalNum - parseFloat(subtotalCalc)).toFixed(2) : '0.00';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ruc || !form.serieNumero || totalNum <= 0) return;

    registrarCompra({
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
      plantillaCodigo: 'COMPRA_MERCADERIA',
      total: '',
      modalidad: 'CREDITO',
      bancoPago: 'BCP_SOLES',
      centroCostos: 'CC-ADMIN'
    });
  };

  const plantillasCompras = plantillas.filter(p => p.tipoOperacion === 'COMPRA');

  const filteredCompras = compras.filter(c => 
    c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ruc.includes(searchTerm) ||
    c.serieNumero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalComprasMonto = compras.reduce((acc, c) => acc + c.total, 0);
  const totalPendiente = compras.filter(c => c.estadoPago === 'PENDIENTE').reduce((acc, c) => acc + c.saldoPendiente, 0);

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Adquisiciones" 
          value={`S/ ${totalComprasMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Compras registradas en el período" 
          badgeText={`${compras.length} Facturas`} 
          badgeType="info" 
        />
        <MetricCard 
          title="Crédito Fiscal IGV (18%)" 
          value={`S/ ${(totalComprasMonto - (totalComprasMonto / 1.18)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="A favor de la empresa" 
          badgeText="Cta 4011" 
          badgeType="success" 
        />
        <MetricCard 
          title="Por Pagar a Proveedores" 
          value={`S/ ${totalPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Pendiente en cuentas 42" 
          badgeText="Crédito" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Pagado al Contado" 
          value={`S/ ${(totalComprasMonto - totalPendiente).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Desembolso bancario directo" 
          badgeText="Cancelado" 
          badgeType="neutral" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por Proveedor, RUC o N° Factura..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> Registrar Factura de Compra
          <span className="btn__badge">F2</span>
        </button>
      </div>

      {/* TABLA DE COMPRAS */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Fecha</th>
              <th style={{ width: '120px' }}>Comprobante</th>
              <th>Proveedor / RUC</th>
              <th>Concepto</th>
              <th className="text-right" style={{ width: '90px' }}>Subtotal</th>
              <th className="text-right" style={{ width: '90px' }}>IGV (18%)</th>
              <th className="text-right" style={{ width: '110px' }}>Total (S/.)</th>
              <th style={{ width: '90px' }} className="text-center">Modalidad</th>
              <th style={{ width: '100px' }} className="text-center">Estado Pago</th>
              <th style={{ width: '110px' }} className="mono">Voucher(s)</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompras.map((c) => (
              <tr key={c.id}>
                <td className="mono text-muted">{c.fecha}</td>
                <td className="mono font-bold" style={{ color: '#2563EB' }}>{c.serieNumero}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.razonSocial}</div>
                  <div className="mono" style={{ fontSize: '11px', color: '#64748B' }}>RUC: {c.ruc}</div>
                </td>
                <td style={{ fontSize: '12px', color: '#475569' }}>{c.concepto}</td>
                <td className="mono text-right">S/ {c.subtotal.toFixed(2)}</td>
                <td className="mono text-right" style={{ color: '#10B981' }}>S/ {c.igv.toFixed(2)}</td>
                <td className="mono text-right font-bold">S/ {c.total.toFixed(2)}</td>
                <td className="text-center">
                  <span className={`badge badge--${c.modalidad === 'CONTADO' ? 'info' : 'neutral'}`}>
                    {c.modalidad}
                  </span>
                </td>
                <td className="text-center">
                  <span className={`badge badge--${c.estadoPago === 'PAGADO' ? 'success' : 'warning'}`}>
                    {c.estadoPago === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  <div>{c.voucherProvision}</div>
                  {c.voucherPago && (
                    <div style={{ color: '#10B981', fontSize: '10px' }}>+ {c.voucherPago}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: REGISTRAR COMPRA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Factura de Compra (Gestión Proveedores)"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSubmit}>
              Contabilizar Factura
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--info">
            Ingrese los datos de la factura. El sistema calculará automáticamente el <strong>Subtotal (Total / 1.18)</strong> y el <strong>IGV (18%)</strong>.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">RUC Proveedor</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="20600000000" 
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">Razón Social</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="DISTRIBUIDORA SAC" 
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
                placeholder="F001-0001234" 
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plantilla Contable</label>
              <select 
                className="form-control"
                value={form.plantillaCodigo}
                onChange={(e) => setForm({ ...form, plantillaCodigo: e.target.value })}
              >
                {plantillasCompras.map(p => (
                  <option key={p.codigo} value={p.codigo}>{p.nombre} ({p.codigo})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centro de Costo</label>
              <select 
                className="form-control"
                value={form.centroCostos}
                onChange={(e) => setForm({ ...form, centroCostos: e.target.value })}
              >
                <option value="CC-ADMIN">CC-ADMIN (Administración)</option>
                <option value="CC-LOGISTICA">CC-LOGISTICA (Operaciones)</option>
                <option value="CC-VENTAS">CC-VENTAS (Comercial)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Concepto / Glosa</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Descripción breve de los bienes o servicios..." 
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            />
          </div>

          {/* CÁLCULO DE IMPORTES */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '6px', border: '1px solid #E2E8F0', margin: '14px 0' }}>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label form-label--required" style={{ color: '#2563EB', fontWeight: 700 }}>
                Precio Total del Comprobante (S/.)
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
                <div style={{ fontSize: '11px', color: '#10B981' }}>IGV Crédito Fiscal (18%)</div>
                <div className="mono font-bold" style={{ fontSize: '15px', color: '#10B981' }}>S/ {igvCalc}</div>
              </div>
            </div>
          </div>

          {/* CONDICIÓN DE PAGO (CAMINO A vs CAMINO B) */}
          <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
            CONDICIÓN Y MODALIDAD DE PAGO
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <button
              type="button"
              className={`btn ${form.modalidad === 'CREDITO' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ justifyContent: 'center' }}
              onClick={() => setForm({ ...form, modalidad: 'CREDITO' })}
            >
              <Clock size={14} /> A Crédito (1 Asiento Provisión)
            </button>
            <button
              type="button"
              className={`btn ${form.modalidad === 'CONTADO' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ justifyContent: 'center' }}
              onClick={() => setForm({ ...form, modalidad: 'CONTADO' })}
            >
              <Zap size={14} /> Al Contado (2 Asientos en Paralelo)
            </button>
          </div>

          {form.modalidad === 'CONTADO' && (
            <div className="form-group" style={{ backgroundColor: '#EFF6FF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <label className="form-label form-label--required" style={{ color: '#1D4ED8' }}>
                Seleccione Banco de Desembolso
              </label>
              <select 
                className="form-control"
                value={form.bancoPago}
                onChange={(e) => setForm({ ...form, bancoPago: e.target.value })}
              >
                {bancos.map(b => (
                  <option key={b.alias} value={b.alias}>
                    {b.alias} — {b.nombreBanco} (Saldo: S/ {b.saldoLibros.toFixed(2)})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px' }}>
                * El sistema generará el asiento de compra (60/40/42) y el asiento de pago simultáneo (42 vs {form.bancoPago}).
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
