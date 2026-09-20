import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { Landmark, Plus, Search, CheckCircle, AlertCircle } from 'lucide-react';

export const BancosView = () => {
  const { bancos, agregarBanco, planContable } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    alias: '',
    nombreBanco: 'Banco de Crédito del Perú (BCP)',
    tipoCuenta: 'Cuenta Corriente',
    moneda: 'PEN',
    numeroCuenta: '',
    cci: '',
    codigoContable: '104101',
    saldoInicial: '0.00'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.alias || !form.numeroCuenta) return;

    const cta = planContable.find(c => c.codigo === form.codigoContable);

    agregarBanco({
      alias: form.alias.toUpperCase().replace(/\s+/g, '_'),
      nombreBanco: form.nombreBanco,
      tipoCuenta: form.tipoCuenta,
      moneda: form.moneda,
      numeroCuenta: form.numeroCuenta,
      cci: form.cci,
      codigoContable: form.codigoContable,
      nombreCuentaContable: cta ? cta.descripcion : "CUENTA CORRIENTE BANCARIA",
      saldoInicial: parseFloat(form.saldoInicial)
    });

    setIsModalOpen(false);
    setForm({
      alias: '',
      nombreBanco: 'Banco de Crédito del Perú (BCP)',
      tipoCuenta: 'Cuenta Corriente',
      moneda: 'PEN',
      numeroCuenta: '',
      cci: '',
      codigoContable: '104101',
      saldoInicial: '0.00'
    });
  };

  const totalSoles = bancos.filter(b => b.moneda === 'PEN').reduce((acc, b) => acc + b.saldoLibros, 0);
  const totalDolares = bancos.filter(b => b.moneda === 'USD').reduce((acc, b) => acc + b.saldoLibros, 0);

  const filteredBancos = bancos.filter(b => 
    b.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.nombreBanco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.codigoContable.includes(searchTerm)
  );

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Cuentas Bancarias" 
          value={bancos.length} 
          subtext="Entidades financieras registradas" 
          badgeText="Operativas" 
          badgeType="success" 
        />
        <MetricCard 
          title="Disponibilidad MN (Soles)" 
          value={`S/ ${totalSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Saldo contable en libros" 
          badgeText="PEN" 
          badgeType="info" 
        />
        <MetricCard 
          title="Disponibilidad ME (USD)" 
          value={`$ ${totalDolares.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext="Cuentas en moneda extranjera" 
          badgeText="USD" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Cuentas Conciliadas" 
          value={`${bancos.filter(b => b.estado === 'CUADRADO').length} de ${bancos.length}`} 
          subtext="Sin discrepancias con extracto" 
          badgeText="Al Día" 
          badgeType="success" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por Alias (ej. BCP_SOLES) o Banco..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> Nueva Cuenta Bancaria
        </button>
      </div>

      {/* TABLA DE BANCOS */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Alias / Entidad Financiera</th>
              <th>N° Cuenta / CCI</th>
              <th style={{ width: '80px' }}>Moneda</th>
              <th>Código Contable PCGE</th>
              <th className="text-right" style={{ width: '130px' }}>Saldo en Libros</th>
              <th className="text-right" style={{ width: '130px' }}>Saldo Extracto</th>
              <th style={{ width: '100px' }} className="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredBancos.map((banco) => (
              <tr key={banco.id}>
                <td>
                  <div style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                    {banco.alias}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {banco.nombreBanco} — {banco.tipoCuenta}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: '11.5px' }}>
                  <div>{banco.numeroCuenta}</div>
                  <div style={{ color: '#94A3B8', fontSize: '10.5px' }}>CCI: {banco.cci}</div>
                </td>
                <td className="mono font-bold">{banco.moneda}</td>
                <td>
                  <span className="mono" style={{ fontWeight: 600, color: '#0F172A' }}>
                    {banco.codigoContable}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {banco.nombreCuentaContable}
                  </div>
                </td>
                <td className="mono text-right font-bold" style={{ color: '#10B981' }}>
                  {banco.moneda === 'PEN' ? 'S/ ' : '$ '}
                  {banco.saldoLibros.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono text-right" style={{ color: '#475569' }}>
                  {banco.moneda === 'PEN' ? 'S/ ' : '$ '}
                  {banco.saldoExtracto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-center">
                  <span className={`badge badge--${banco.estado === 'CUADRADO' ? 'success' : 'warning'}`}>
                    {banco.estado === 'CUADRADO' ? 'Cuadrado' : 'Dif. GMF'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVA CUENTA BANCARIA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nueva Cuenta Bancaria"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSubmit}>Guardar Cuenta</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--info">
            Toda cuenta bancaria debe asociarse a un Alias identificador y a una cuenta analítica del Elemento 104 del Plan Contable para evitar dinero fantasma.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">Alias del Banco</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="ej. BCP_SOLES_02" 
                value={form.alias} 
                onChange={(e) => setForm({ ...form, alias: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Entidad Bancaria</label>
              <select 
                className="form-control"
                value={form.nombreBanco}
                onChange={(e) => setForm({ ...form, nombreBanco: e.target.value })}
              >
                <option>Banco de Crédito del Perú (BCP)</option>
                <option>Interbank</option>
                <option>BBVA Perú</option>
                <option>Scotiabank Perú</option>
                <option>Banco de la Nación</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">Número de Cuenta</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="193-0000000-0-00" 
                value={form.numeroCuenta} 
                onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Código Interbancario (CCI)</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="002-193-000000000000-00" 
                value={form.cci} 
                onChange={(e) => setForm({ ...form, cci: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Moneda</label>
              <select 
                className="form-control"
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              >
                <option value="PEN">PEN - Soles (S/.)</option>
                <option value="USD">USD - Dólares ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Código Contable PCGE</label>
              <select 
                className="form-control form-control--mono"
                value={form.codigoContable}
                onChange={(e) => setForm({ ...form, codigoContable: e.target.value })}
              >
                <option value="104101">104101 - BANCO BCP MN</option>
                <option value="104102">104102 - BANCO INTERBANK MN</option>
                <option value="104103">104103 - BANCO BBVA USD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Saldo Inicial</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-control form-control--mono" 
              value={form.saldoInicial} 
              onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })} 
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
