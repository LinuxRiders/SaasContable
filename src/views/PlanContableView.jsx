import React, { useState, useRef } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { parseExcelPlanContable } from '../utils/excelParser';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square, 
  ArrowRight,
  Download,
  Upload,
  Copy
} from 'lucide-react';

export const PlanContableView = () => {
  const { planContable, agregarCuenta, modificarCuenta, eliminarCuenta, reemplazarPlanContable } = useAccounting();
  const [activeElemento, setActiveElemento] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuenta, setSelectedCuenta] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREAR'); // 'CREAR' o 'EDITAR'
  
  const fileInputRef = useRef(null);

  const handleImportarExcelClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await parseExcelPlanContable(file);
      reemplazarPlanContable(result.cuentas);
      alert(`Importación exitosa. Cuentas importadas: ${result.stats.total}\nCuentas Imputables (U): ${result.stats.usables}`);
    } catch (err) {
      console.error(err);
      alert('Error al importar el archivo Excel');
    } finally {
      e.target.value = '';
    }
  };

  const handleLoadLocalPlan = async () => {
    try {
      const response = await fetch('/PlanContable.xlsx');
      const blob = await response.blob();
      const file = new File([blob], 'PlanContable.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await parseExcelPlanContable(file);
      reemplazarPlanContable(result.cuentas);
      alert(`Carga local exitosa. Cuentas importadas: ${result.stats.total}\nCuentas Imputables (U): ${result.stats.usables}`);
    } catch(err) {
      console.error(err);
      alert('Error al cargar PlanContable.xlsx local');
    }
  };

  // Formulario modal mantenimiento de cuenta (Figma 118-1854)
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    elemento: 1,
    esCuentaU: true,
    moneda: 'MN',
    tipoAnalisis: 'Por Documento / RUC',
    amarre1: '',
    amarre2: '',
    amarre3: '',
    requiereCC: false,
    rubroEF1: 'EF-01',
    rubroEF2: 'EF-02'
  });

  const elementosTabs = [
    { id: 'ALL', label: 'Todos (1 - 9)' },
    { id: 1, label: '1 Activo' },
    { id: 2, label: '2 Pasivo Realiz.' },
    { id: 3, label: '3 Inmovilizado' },
    { id: 4, label: '4 Pasivo' },
    { id: 5, label: '5 Patrimonio' },
    { id: 6, label: '6 Gastos' },
    { id: 7, label: '7 Ventas / Ingresos' },
    { id: 8, label: '8 Cierre' },
    { id: 9, label: '9 Analíticas CC' }
  ];

  const handleOpenCrear = () => {
    setModalMode('CREAR');
    setForm({
      codigo: '',
      descripcion: '',
      elemento: 6,
      esCuentaU: true,
      moneda: 'MN',
      tipoAnalisis: 'Por Documento / RUC',
      amarre1: '9411101',
      amarre2: '7911101',
      amarre3: 'CC-ADMIN',
      requiereCC: true,
      rubroEF1: '',
      rubroEF2: 'EF-02'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditar = (cuenta) => {
    setModalMode('EDITAR');
    setSelectedCuenta(cuenta);
    setForm({
      codigo: cuenta.codigo,
      descripcion: cuenta.descripcion,
      elemento: cuenta.elemento,
      esCuentaU: cuenta.esCuentaU,
      moneda: cuenta.moneda,
      tipoAnalisis: cuenta.tipoAnalisis || 'Por Documento / RUC',
      amarre1: cuenta.amarre1 || '',
      amarre2: cuenta.amarre2 || '',
      amarre3: cuenta.amarre3 || '',
      requiereCC: cuenta.requiereCC || false,
      rubroEF1: cuenta.rubroEF1 || '',
      rubroEF2: cuenta.rubroEF2 || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.codigo || !form.descripcion) return;

    if (form.amarre1 && !planContable.find(c => c.codigo === form.amarre1)) {
      alert(`Error: La cuenta destino asignada en Amarre 1 (${form.amarre1}) no existe en el plan contable actual.`);
      return;
    }
    if (form.amarre2 && !planContable.find(c => c.codigo === form.amarre2)) {
      alert(`Error: La cuenta contrapartida asignada en Amarre 2 (${form.amarre2}) no existe en el plan contable actual.`);
      return;
    }

    if (modalMode === 'CREAR') {
      agregarCuenta({
        ...form,
        saldoDeudor: 0,
        saldoAcreedor: 0
      });
    } else {
      modificarCuenta(form.codigo, form);
    }
    setIsModalOpen(false);
  };

  const filteredCuentas = planContable.filter(c => {
    const matchElemento = activeElemento === 'ALL' || c.elemento === activeElemento;
    const matchSearch = c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    return matchElemento && matchSearch;
  });

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Cuentas PCGE" 
          value={planContable.length} 
          subtext="Catálogo oficial en uso" 
          badgeText="Oficial 2026" 
          badgeType="info" 
        />
        <MetricCard 
          title="Cuentas Imputables (U)" 
          value={planContable.filter(c => c.esCuentaU).length} 
          subtext="Reciben asientos contables" 
          badgeText="Analíticas" 
          badgeType="success" 
        />
        <MetricCard 
          title="Cuentas de Agrupación" 
          value={planContable.filter(c => !c.esCuentaU).length} 
          subtext="Cuentas sintéticas / títulos" 
          badgeText="Padres" 
          badgeType="neutral" 
        />
        <MetricCard 
          title="Con Amarres de Destino" 
          value={planContable.filter(c => c.amarre1 && c.amarre2).length} 
          subtext="Clase 6 a Clase 9/79" 
          badgeText="Automático" 
          badgeType="warning" 
        />
      </div>

      {/* TABS DE ELEMENTOS 1 - 9 */}
      <div className="tabs-bar">
        {elementosTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeElemento === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveElemento(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por código (ej. 6011) o denominación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn btn--secondary btn--sm">
          <Download size={13} /> Exportar
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls" 
          style={{ display: 'none' }} 
        />
        <button className="btn btn--secondary btn--sm" onClick={handleImportarExcelClick}>
          <Upload size={13} /> Importar Excel
        </button>
        
        <button className="btn btn--secondary btn--sm" onClick={handleLoadLocalPlan} title="Cargar PlanContable.xlsx de raíz">
          <Copy size={13} /> Cargar Local
        </button>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={handleOpenCrear}>
          <Plus size={14} /> Nueva Cuenta
        </button>
      </div>

      {/* TABLA DEL PLAN CONTABLE */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>N° Cuenta</th>
              <th>Descripción / Denominación</th>
              <th style={{ width: '50px' }} className="text-center">U</th>
              <th style={{ width: '60px' }}>Moneda</th>
              <th style={{ width: '130px' }}>Tipo Análisis</th>
              <th style={{ width: '90px' }} className="mono">Amarre 1 (D)</th>
              <th style={{ width: '90px' }} className="mono">Amarre 2 (H)</th>
              <th style={{ width: '90px' }}>C. Costo</th>
              <th style={{ width: '80px' }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCuentas.map((cuenta) => {
              const isGroup = !cuenta.esCuentaU;
              return (
                <tr 
                  key={cuenta.codigo} 
                  style={{ 
                    backgroundColor: isGroup ? '#F8FAFC' : undefined,
                    fontWeight: isGroup ? 700 : 400
                  }}
                >
                  <td className="mono" style={{ color: isGroup ? '#1E293B' : '#2563EB', fontWeight: 600 }}>
                    {cuenta.codigo}
                  </td>
                  <td>
                    <span style={{ paddingLeft: `${Math.max(0, (cuenta.codigo.length - 2) * 8)}px` }}>
                      {cuenta.descripcion}
                    </span>
                  </td>
                  <td className="text-center">
                    {cuenta.esCuentaU ? (
                      <CheckSquare size={14} color="#10B981" />
                    ) : (
                      <Square size={14} color="#CBD5E1" />
                    )}
                  </td>
                  <td className="mono text-muted">{cuenta.moneda}</td>
                  <td style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {cuenta.tipoAnalisis || '—'}
                  </td>
                  <td className="mono text-muted">{cuenta.amarre1 || '—'}</td>
                  <td className="mono text-muted">{cuenta.amarre2 || '—'}</td>
                  <td>
                    {cuenta.requiereCC ? (
                      <span className="badge badge--warning" style={{ fontSize: '10px' }}>
                        Obligatorio
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>No</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button 
                        className="btn btn--secondary btn--sm" 
                        style={{ padding: '3px 6px' }}
                        title="Editar cuenta"
                        onClick={() => handleOpenEditar(cuenta)}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        className="btn btn--secondary btn--sm" 
                        style={{ padding: '3px 6px', color: '#EF4444' }}
                        title="Eliminar cuenta"
                        onClick={() => eliminarCuenta(cuenta.codigo)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL MANTENIMIENTO DE CUENTA CONTABLE (Figma 118-1854) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'CREAR' ? "Mantenimiento: Nueva Cuenta Contable" : `Mantenimiento de Cuenta Contable (${form.codigo})`}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSubmit}>
              {modalMode === 'CREAR' ? "Guardar Cuenta" : "Actualizar Cuenta"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--info">
            Configure la cuenta contable y sus reglas de amarre automático para transferencias de gastos por naturaleza (Clase 6) a función (Clase 9 y 79).
          </div>

          <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
            1. IDENTIFICACIÓN Y NIVEL DE LA CUENTA
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">Número de Cuenta</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="ej. 6311101" 
                value={form.codigo}
                disabled={modalMode === 'EDITAR'}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Elemento / Clase</label>
              <select 
                className="form-control"
                value={form.elemento}
                onChange={(e) => setForm({ ...form, elemento: parseInt(e.target.value) })}
              >
                <option value={1}>1 - Activo Disponible</option>
                <option value={2}>2 - Activo Realizable</option>
                <option value={3}>3 - Activo Inmovilizado</option>
                <option value={4}>4 - Pasivo</option>
                <option value={5}>5 - Patrimonio</option>
                <option value={6}>6 - Gastos por Naturaleza</option>
                <option value={7}>7 - Ingresos</option>
                <option value={8}>8 - Cierre</option>
                <option value={9}>9 - Analíticas de Explotación</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label--required">Descripción / Denominación</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="ej. SERVICIOS DE TRANSPORTE Y FLETE" 
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              required
            />
          </div>

          <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
            2. MONEDA Y AMARRES AUTOMÁTICOS (DESTINO CONTABLE)
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Moneda</label>
              <select 
                className="form-control"
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              >
                <option value="MN">MN - Soles (S/.)</option>
                <option value="ME">ME - Dólares ($)</option>
                <option value="AMBAS">Ambas Monedas</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Análisis</label>
              <select 
                className="form-control"
                value={form.tipoAnalisis}
                onChange={(e) => setForm({ ...form, tipoAnalisis: e.target.value })}
              >
                <option>Por Documento / RUC</option>
                <option>Solo Monto</option>
                <option>Sin Análisis</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amarre 1 (Debe Destino)</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="ej. 9411101" 
                value={form.amarre1}
                onChange={(e) => setForm({ ...form, amarre1: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amarre 2 (Haber Contrapartida)</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="ej. 7911101" 
                value={form.amarre2}
                onChange={(e) => setForm({ ...form, amarre2: e.target.value })}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Amarre 3 (C. Costo por Defecto)</label>
            <input 
              type="text" 
              className="form-control form-control--mono" 
              placeholder="ej. CC-ADMIN" 
              value={form.amarre3}
              onChange={(e) => setForm({ ...form, amarre3: e.target.value })}
            />
          </div>

          <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
            3. CARACTERÍSTICAS Y OBLIGATORIEDAD
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-checkbox">
              <input 
                type="checkbox" 
                checked={form.esCuentaU}
                onChange={(e) => setForm({ ...form, esCuentaU: e.target.checked })}
              />
              <span className="form-checkbox-label">
                <strong>Cuenta de Uso (U)</strong> — Permite registrar asientos contables directamente en vouchers.
              </span>
            </label>

            <label className="form-checkbox">
              <input 
                type="checkbox" 
                checked={form.requiereCC}
                onChange={(e) => setForm({ ...form, requiereCC: e.target.checked })}
              />
              <span className="form-checkbox-label">
                <strong>Requiere Centro de Costo</strong> — Obligatorio seleccionar CC al momento de contabilizar.
              </span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
