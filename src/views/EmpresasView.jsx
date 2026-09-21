import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { Building2, Plus, CheckCircle, Search, Edit3, Eye, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { parseExcelPlanContable } from '../utils/excelParser';

export const EmpresasView = () => {
  const { empresas, empresaActiva, setEmpresaActiva, agregarEmpresa } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  // Formulario nueva empresa
  const [form, setForm] = useState({
    ruc: '',
    razonSocial: '',
    abreviatura: '',
    regimen: 'Régimen MYPE Tributario',
    monedaBase: 'PEN - Soles (S/.)',
    monedaSecundaria: 'USD - Dólares ($)',
    direccion: '',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'MIRAFLORES',
    correo: '',
    telefono: '',
    modoInicializacion: 'PCGE_2026',
    planPersonalizado: []
  });

  const handleNextStep = (e) => {
    e.preventDefault();
    if (modalStep < 3) setModalStep(modalStep + 1);
  };
  
  const handlePrevStep = () => {
    if (modalStep > 1) setModalStep(modalStep - 1);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await parseExcelPlanContable(file);
      setForm(prev => ({ ...prev, planPersonalizado: result.cuentas }));
      alert(`Importación exitosa. Cuentas leídas: ${result.stats.total}`);
    } catch (err) {
      console.error(err);
      alert('Error al leer el archivo Excel');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ruc || !form.razonSocial) return;

    if (form.modoInicializacion === 'IMPORTAR_EXCEL' && form.planPersonalizado.length === 0) {
      alert('Debe adjuntar un archivo Excel para continuar con esta opción.');
      return;
    }

    let planAsignadoLabel = "PCGE 2026 - Oficial Modificado";
    if (form.modoInicializacion === 'IMPORTAR_EXCEL') planAsignadoLabel = "Importado de Excel";
    if (form.modoInicializacion === 'EN_BLANCO') planAsignadoLabel = "Plan Vacío";

    agregarEmpresa({
      ruc: form.ruc,
      razonSocial: form.razonSocial,
      abreviatura: form.abreviatura || form.razonSocial.substring(0, 18),
      regimen: form.regimen,
      monedaBase: form.monedaBase,
      monedaSecundaria: form.monedaSecundaria,
      direccion: form.direccion,
      departamento: form.departamento,
      provincia: form.provincia,
      distrito: form.distrito,
      correo: form.correo,
      telefono: form.telefono,
      planAsignado: planAsignadoLabel,
      digitosRegistro: "7 Dígitos (Analítico)"
    }, form.modoInicializacion, form.planPersonalizado);

    setIsModalOpen(false);
    setModalStep(1);
    setForm({
      ruc: '',
      razonSocial: '',
      abreviatura: '',
      regimen: 'Régimen MYPE Tributario',
      monedaBase: 'PEN - Soles (S/.)',
      monedaSecundaria: 'USD - Dólares ($)',
      direccion: '',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'MIRAFLORES',
      correo: '',
      telefono: '',
      modoInicializacion: 'PCGE_2026',
      planPersonalizado: []
    });
  };

  const filteredEmpresas = empresas.filter(emp => 
    emp.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.ruc.includes(searchTerm) ||
    emp.abreviatura.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-body">
      {/* KPIs */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Empresas" 
          value={empresas.length} 
          subtext="Compañías registradas en el estudio" 
          badgeText={`${empresas.filter(e => e.estado === 'ACTIVA').length} Activas`} 
          badgeType="success" 
        />
        <MetricCard 
          title="Régimen MYPE / General" 
          value={empresas.filter(e => e.regimen.includes('General') || e.regimen.includes('MYPE')).length} 
          subtext="Contabilidad Completa" 
          badgeText="Mayoría" 
          badgeType="info" 
        />
        <MetricCard 
          title="Padrón SUNAT" 
          value="AL DÍA" 
          subtext="Última sincronización: 08:30 AM" 
          badgeText="Conectado" 
          badgeType="success" 
        />
        <MetricCard 
          title="Empresa en Operación" 
          value={empresaActiva.abreviatura} 
          subtext={`RUC: ${empresaActiva.ruc}`} 
          badgeText="Seleccionada" 
          badgeType="warning" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por RUC, Razón Social o Nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> Nueva Empresa
          <span className="btn__badge">F2</span>
        </button>
      </div>

      {/* TABLA DE EMPRESAS */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>N°</th>
              <th>Abreviatura / Razón Social</th>
              <th style={{ width: '130px' }}>N° RUC</th>
              <th>Régimen Tributario</th>
              <th>Plan Asignado</th>
              <th style={{ width: '100px' }} className="text-center">Estado</th>
              <th style={{ width: '140px' }} className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmpresas.map((emp, index) => {
              const isSelected = emp.id === empresaActiva.id;
              return (
                <tr key={emp.id} style={{ backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : undefined }}>
                  <td className="mono text-muted">{emp.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: isSelected ? '#2563EB' : '#0F172A' }}>
                      {emp.abreviatura}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{emp.razonSocial}</div>
                  </td>
                  <td className="mono font-bold">{emp.ruc}</td>
                  <td style={{ fontSize: '12px' }}>{emp.regimen}</td>
                  <td style={{ fontSize: '11.5px', color: '#475569' }}>
                    {emp.planAsignado} <span className="mono" style={{ color: '#10B981' }}>({emp.cuentasCount} Ctas)</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge badge--${emp.estado === 'ACTIVA' ? 'success' : 'warning'}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="text-center">
                    {isSelected ? (
                      <span className="badge badge--success" style={{ fontSize: '10.5px' }}>
                        <CheckCircle size={11} /> Activa
                      </span>
                    ) : (
                      <button 
                        className="btn btn--secondary btn--sm" 
                        onClick={() => setEmpresaActiva(emp)}
                      >
                        Seleccionar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: INGRESAR NUEVA COMPAÑÍA USUARIA */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Ingresar Nueva Compañía Usuaria"
        footer={
          <>
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
              <div>
                {modalStep > 1 && (
                  <button className="btn btn--secondary" onClick={handlePrevStep}>
                    <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Anterior
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                {modalStep < 3 ? (
                  <button className="btn btn--primary" onClick={handleNextStep}>
                    Siguiente <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                  </button>
                ) : (
                  <button className="btn btn--primary" onClick={handleSubmit}>Guardar Empresa</button>
                )}
              </div>
            </div>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--info">
            Paso {modalStep} de 3: Complete los datos requeridos para aperturar la empresa en el sistema contable.
          </div>

          {modalStep === 1 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
                1. IDENTIFICACIÓN Y DATOS TRIBUTARIOS
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label form-label--required">Número de RUC</label>
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
                  <label className="form-label form-label--required">Abreviatura Comercial</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="EMPRESA S.A.C." 
                    value={form.abreviatura} 
                    onChange={(e) => setForm({ ...form, abreviatura: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Razón Social SUNAT</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="EMPRESA EJEMPLO SOCIEDAD ANÓNIMA CERRADA" 
                  value={form.razonSocial} 
                  onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} 
                  required 
                />
              </div>
            </>
          )}

          {modalStep === 2 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
                2. PARÁMETROS CONTABLES Y MONEDAS
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Régimen Tributario</label>
                  <select 
                    className="form-control" 
                    value={form.regimen} 
                    onChange={(e) => setForm({ ...form, regimen: e.target.value })}
                  >
                    <option>Régimen General (29.5%)</option>
                    <option>Régimen MYPE Tributario</option>
                    <option>Régimen Especial (RER)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda Base</label>
                  <select 
                    className="form-control" 
                    value={form.monedaBase} 
                    onChange={(e) => setForm({ ...form, monedaBase: e.target.value })}
                  >
                    <option>PEN - Soles (S/.)</option>
                    <option>USD - Dólares ($)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {modalStep === 3 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
                3. INICIALIZACIÓN DEL CATÁLOGO DE CUENTAS
              </div>

              <div className="form-group">
                <label className="form-label">Modo de Inicialización</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <label className="form-checkbox" style={{ alignItems: 'flex-start' }}>
                    <input 
                      type="radio" 
                      name="modoInicializacion" 
                      value="PCGE_2026" 
                      checked={form.modoInicializacion === 'PCGE_2026'} 
                      onChange={(e) => setForm({...form, modoInicializacion: e.target.value})} 
                      style={{ marginTop: '2px' }}
                    />
                    <div className="form-checkbox-label">
                      <strong>PCGE 2026 Oficial (Recomendado)</strong>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Duplica el catálogo estándar con amarres y estructuras preconfiguradas.
                      </div>
                    </div>
                  </label>

                  <label className="form-checkbox" style={{ alignItems: 'flex-start' }}>
                    <input 
                      type="radio" 
                      name="modoInicializacion" 
                      value="IMPORTAR_EXCEL" 
                      checked={form.modoInicializacion === 'IMPORTAR_EXCEL'} 
                      onChange={(e) => setForm({...form, modoInicializacion: e.target.value})} 
                      style={{ marginTop: '2px' }}
                    />
                    <div className="form-checkbox-label">
                      <strong>Subir Plan desde Excel (.xlsx)</strong>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Importar catálogo propio estructurado desde archivo local.
                      </div>
                      
                      {form.modoInicializacion === 'IMPORTAR_EXCEL' && (
                        <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px' }}>
                          <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={handleFileChange} 
                            style={{ fontSize: '12px' }}
                          />
                          {form.planPersonalizado.length > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '6px', fontWeight: 600 }}>
                              <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                              {form.planPersonalizado.length} cuentas listas para importar.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="form-checkbox" style={{ alignItems: 'flex-start' }}>
                    <input 
                      type="radio" 
                      name="modoInicializacion" 
                      value="EN_BLANCO" 
                      checked={form.modoInicializacion === 'EN_BLANCO'} 
                      onChange={(e) => setForm({...form, modoInicializacion: e.target.value})} 
                      style={{ marginTop: '2px' }}
                    />
                    <div className="form-checkbox-label">
                      <strong>Iniciar Plan en Blanco</strong>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Catálogo vacío. Creación manual estructurada posteriormente.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
