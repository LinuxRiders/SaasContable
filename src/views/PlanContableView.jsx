import React, { useState, useRef } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { parseExcelPlanContable } from '../utils/excelParser';
import { descargarPlantillaExcel, exportarPlanAExcel } from '../utils/excelTemplateGenerator';
import { MetricCard } from '../components/MetricCard';
import { ModalAuditoriaPlan } from '../components/ModalAuditoriaPlan';
import { ModalClonarPlan } from '../components/ModalClonarPlan';
import { ModalCuenta } from '../components/ModalCuenta';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square, 
  Download,
  Upload,
  Copy
} from 'lucide-react';

export const PlanContableView = () => {
  const { planContable, eliminarCuenta } = useAccounting();
  const [activeElemento, setActiveElemento] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isAuditoriaOpen, setIsAuditoriaOpen] = useState(false);
  const [isClonarOpen, setIsClonarOpen] = useState(false);
  const [isCuentaOpen, setIsCuentaOpen] = useState(false);
  
  const [rawExcelCuentas, setRawExcelCuentas] = useState([]);
  const [selectedCuenta, setSelectedCuenta] = useState(null);
  
  const fileInputRef = useRef(null);

  // Funcionalidad de Botones de la Barra Superior
  const handleDescargarPlantilla = () => {
    descargarPlantillaExcel();
  };

  const handleExportarPlan = () => {
    exportarPlanAExcel(planContable, 'Catalogo_Contable.xlsx');
  };

  const handleImportarExcelClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await parseExcelPlanContable(file);
      setRawExcelCuentas(result.cuentas);
      setIsAuditoriaOpen(true);
    } catch (err) {
      console.error(err);
      alert('Error al leer o parsear el archivo Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCopiarPlan = () => {
    setIsClonarOpen(true);
  };

  const handleNuevaCuenta = () => {
    setSelectedCuenta(null);
    setIsCuentaOpen(true);
  };

  const handleEditarCuenta = (cuenta) => {
    setSelectedCuenta(cuenta);
    setIsCuentaOpen(true);
  };

  // Filtros interactivos
  const [quickFilter, setQuickFilter] = useState('ALL'); // 'ALL', 'SOLO_U', 'SOLO_AMARRES', 'SOLO_ME'

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

  const filteredCuentas = planContable.filter(c => {
    const matchElemento = activeElemento === 'ALL' || c.elemento === activeElemento;
    const matchSearch = c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchQuick = true;
    if (quickFilter === 'SOLO_U') matchQuick = c.esCuentaU;
    if (quickFilter === 'SOLO_AMARRES') matchQuick = !!c.amarre1 || !!c.amarre2;
    if (quickFilter === 'SOLO_ME') matchQuick = c.moneda === 'ME';

    return matchElemento && matchSearch && matchQuick;
  });

  return (
    <div className="content-body">
      {/* METRICAS */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Cuentas PCGE" 
          value={planContable.length} 
          subtext="Catálogo oficial en uso" 
          badgeText="Activo" 
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
          value={planContable.filter(c => c.amarre1 || c.amarre2).length} 
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

      {/* TOOLBAR SUPERIOR */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="toolbar__search" style={{ minWidth: '250px' }}>
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por código (ej. 6011) o denominación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros rápidos */}
        <select 
          className="form-control" 
          style={{ width: 'auto', padding: '0.4rem', fontSize: '13px' }}
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
        >
          <option value="ALL">Filtro: Mostrar Todas</option>
          <option value="SOLO_U">Solo Uso (U)</option>
          <option value="SOLO_AMARRES">Solo con Amarres</option>
          <option value="SOLO_ME">Solo Moneda Extranjera</option>
        </select>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--secondary btn--sm" onClick={handleDescargarPlantilla} title="Descargar plantilla base">
          <Download size={13} /> Plantilla
        </button>

        <button className="btn btn--secondary btn--sm" onClick={handleExportarPlan} title="Exportar catálogo actual">
          <Download size={13} /> Exportar
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls, .csv" 
          style={{ display: 'none' }} 
        />
        <button className="btn btn--secondary btn--sm" onClick={handleImportarExcelClick} title="Subir y auditar Excel">
          <Upload size={13} /> Subir Excel
        </button>
        
        <button className="btn btn--secondary btn--sm" onClick={handleCopiarPlan} title="Clonar desde otra empresa">
          <Copy size={13} /> Copiar Plan
        </button>

        <button className="btn btn--primary btn--sm" onClick={handleNuevaCuenta}>
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
                      <span className="badge badge--success" style={{ padding: '2px 4px', fontSize: '10px' }}>U</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 4px', fontSize: '10px' }}>P</span>
                    )}
                  </td>
                  <td className="mono text-muted">{cuenta.moneda}</td>
                  <td style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {cuenta.tipoAnalisis || '—'}
                  </td>
                  <td className="mono text-muted">{cuenta.amarre1 || '—'}</td>
                  <td className="mono text-muted">{cuenta.amarre2 || '—'}</td>
                  <td>
                    {cuenta.requiereCentroCostos ? (
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
                        onClick={() => handleEditarCuenta(cuenta)}
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
            {filteredCuentas.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No se encontraron cuentas contables.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      <ModalAuditoriaPlan 
        isOpen={isAuditoriaOpen} 
        onClose={() => setIsAuditoriaOpen(false)} 
        rawCuentas={rawExcelCuentas} 
      />
      <ModalClonarPlan 
        isOpen={isClonarOpen} 
        onClose={() => setIsClonarOpen(false)} 
      />
      <ModalCuenta 
        isOpen={isCuentaOpen} 
        onClose={() => setIsCuentaOpen(false)} 
        cuentaEdit={selectedCuenta} 
      />

    </div>
  );
};
