import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { Building2, Plus, CheckCircle, Search, ArrowRight, ArrowLeft, MoreVertical, LogIn, Calendar, Settings } from 'lucide-react';
import { parseExcelPlanContable } from '../utils/excelParser';
import { useAccessManagement } from '../components/gestion-usuarios-empresas/state/AccessManagementContext';

export const EmpresasView = () => {
  const { empresas, agregarEmpresa, seleccionarEmpresaYPeriodo } = useAccounting();
  const { currentUser, getRole, getAccessibleCompanyIds } = useAccessManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  // Estados locales para los selectores de tarjeta
  const [selectedPeriods, setSelectedPeriods] = useState({});

  const handlePeriodChange = (empId, field, value) => {
    setSelectedPeriods(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  const getEmpresaSelections = (emp) => {
    const state = selectedPeriods[emp.id] || {};
    const ej = state.ejercicio || (emp.ejerciciosDisponibles && emp.ejerciciosDisponibles.length > 0 ? emp.ejerciciosDisponibles[0] : new Date().getFullYear().toString());
    const pd = state.periodo || (emp.periodos && emp.periodos.length > 0 ? emp.periodos[0].nombrePeriodo : `ENERO_${ej}`);
    
    // Buscar estado del periodo
    const periodoObj = emp.periodos?.find(p => p.ejercicio === ej && p.nombrePeriodo === pd);
    const estado = periodoObj ? periodoObj.estado : 'ABIERTO';

    return { ejercicio: ej, periodo: pd, estado };
  };

  const handleIngresar = (emp) => {
    const selections = getEmpresaSelections(emp);
    seleccionarEmpresaYPeriodo(emp.id, selections.ejercicio, selections.periodo, selections.estado);
  };

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
    planPersonalizado: [],
    // Nuevos campos Task-06
    plantillasActivas: {
      compras: true,
      ventas: true,
      servicios: true
    },
    autoAmarres: true,
    autoDifCambio: true
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

  const simularSunat = () => {
    if (form.ruc.length === 11) {
      setForm(prev => ({
        ...prev,
        razonSocial: `EMPRESA SIMULADA ${form.ruc} S.A.C.`,
        abreviatura: `SIMULADA ${form.ruc.substring(8)}`,
        direccion: 'AV. SIMULACIÓN 123'
      }));
    } else {
      alert("Ingrese un RUC de 11 dígitos");
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

    const newPlantillasIds = [];
    if (form.plantillasActivas.compras) newPlantillasIds.push("TPL-COMPRA-01");
    if (form.plantillasActivas.ventas) newPlantillasIds.push("TPL-VENTA-01");
    if (form.plantillasActivas.servicios) newPlantillasIds.push("TPL-SERV-01");

    const currentYear = new Date().getFullYear().toString();

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
      digitosRegistro: "7 Dígitos (Analítico)",
      ejerciciosDisponibles: [currentYear],
      jurisdictionCode: 'PE',
      periodos: [
        { ejercicio: currentYear, mes: 1, nombrePeriodo: `ENERO_${currentYear}`, estado: 'ABIERTO' }
      ]
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
      planPersonalizado: [],
      plantillasActivas: { compras: true, ventas: true, servicios: true },
      autoAmarres: true,
      autoDifCambio: true
    });
  };

  const accessibleCompanyIds = getAccessibleCompanyIds();
  const visibleEmpresas = accessibleCompanyIds === null
    ? empresas
    : empresas.filter((empresa) => accessibleCompanyIds.includes(empresa.id));
  const canCreateCompany = Boolean(
    currentUser?.allCompanies || getRole(currentUser?.studyRoleId)?.permissions.includes('study.companies.manage')
  );

  const filteredEmpresas = visibleEmpresas.filter(emp =>
    emp.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.ruc.includes(searchTerm) ||
    emp.regimen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.abreviatura?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-body">
      {/* KPIs */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Empresas" 
          value={visibleEmpresas.length}
          subtext="Compañías registradas en el estudio" 
          badgeText={`${visibleEmpresas.filter(e => e.estado === 'ACTIVA').length} Activas`}
          badgeType="success" 
        />
        <MetricCard 
          title="Régimen MYPE / General" 
          value={visibleEmpresas.filter(e => e.regimen.includes('General') || e.regimen.includes('MYPE')).length}
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
          title="Periodos Activos" 
          value={visibleEmpresas.filter(e => e.periodos?.some(p => p.estado === 'ABIERTO')).length}
          subtext="Empresas con meses abiertos" 
          badgeText="Operativas" 
          badgeType="warning" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="toolbar__search" style={{ width: '350px' }}>
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por RUC, Razón Social o Régimen..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        {canCreateCompany && (
          <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> Nueva Empresa
            <span className="btn__badge">F2</span>
          </button>
        )}
      </div>

      {/* GRID DE TARJETAS DE EMPRESAS (CON ESPACIADO Y PADDING GENEROSO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginTop: '16px' }}>
        {filteredEmpresas.map((emp) => {
          const selections = getEmpresaSelections(emp);

          return (
            <div 
              key={emp.id} 
              className="wireframe-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '22px 24px', 
                margin: 0,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                    {emp.abreviatura || emp.razonSocial}
                  </h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px', lineHeight: 1.4 }}>
                    {emp.razonSocial}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span className="badge badge--neutral mono" style={{ fontSize: '11px', padding: '2px 7px' }}>
                      RUC: {emp.ruc}
                    </span>
                    <span className={`badge ${emp.estado === 'ACTIVA' ? 'badge--info' : 'badge--neutral'}`} style={{ fontSize: '10.5px' }}>
                      {emp.estado}
                    </span>
                  </div>
                </div>
                <button 
                  className="btn btn--secondary btn--sm" 
                  style={{ padding: '5px', border: '1px solid var(--border-light)', background: 'transparent' }} 
                  title="Opciones de Empresa"
                >
                  <MoreVertical size={14} color="var(--text-muted)" />
                </button>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                fontSize: '12px', 
                color: 'var(--text-muted)', 
                marginBottom: '18px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Régimen:</span> 
                  <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{emp.regimen}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Moneda Principal:</span> 
                  <span className="mono" style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{emp.monedaBase?.split(' - ')[0] || 'PEN'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Plan de Cuentas:</span> 
                  <span className="mono" style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{emp.cuentasCount || 120} Cuentas</span>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#FFFFFF', 
                padding: '14px 16px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-medium)',
                marginTop: 'auto' 
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} /> Seleccionar Período de Trabajo
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select 
                    className="form-control mono" 
                    style={{ flex: 1, padding: '6px 8px', fontSize: '11.5px' }}
                    value={selections.ejercicio}
                    onChange={(e) => handlePeriodChange(emp.id, 'ejercicio', e.target.value)}
                  >
                    {(emp.ejerciciosDisponibles || ['2026']).map(ej => (
                      <option key={ej} value={ej}>{ej}</option>
                    ))}
                  </select>
                  <select 
                    className="form-control mono" 
                    style={{ flex: 2, padding: '6px 8px', fontSize: '11.5px' }}
                    value={selections.periodo}
                    onChange={(e) => handlePeriodChange(emp.id, 'periodo', e.target.value)}
                  >
                    {(emp.periodos || [{ nombrePeriodo: 'ENERO_2026' }])
                      .filter(p => !selections.ejercicio || p.ejercicio === selections.ejercicio)
                      .map(p => (
                      <option key={p.nombrePeriodo} value={p.nombrePeriodo}>{p.nombrePeriodo.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700' }} className="mono">
                    <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: selections.estado === 'ABIERTO' ? '#10B981' : '#EF4444' }}></span>
                    <span style={{ color: selections.estado === 'ABIERTO' ? '#0F172A' : '#64748B' }}>
                      {selections.estado}
                    </span>
                  </div>
                  <button 
                    className="btn btn--primary btn--sm" 
                    style={{ padding: '6px 12px', fontSize: '11.5px' }}
                    onClick={() => handleIngresar(emp)}
                  >
                    <span>Ingresar</span> 
                    <LogIn size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEmpresas.length === 0 && (
        <div className="empty-state">
          No tienes empresas asignadas con los filtros actuales.
        </div>
      )}

      {/* MODAL: INGRESAR NUEVA COMPAÑÍA USUARIA (ASISTENTE 3 PASOS) */}
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
                  <button className="btn btn--primary" onClick={handleSubmit}>Aperturar Empresa</button>
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
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label form-label--required">Número de RUC</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control form-control--mono" 
                      placeholder="20600000000" 
                      value={form.ruc} 
                      onChange={(e) => setForm({ ...form, ruc: e.target.value })} 
                      required 
                    />
                    <button type="button" className="btn btn--secondary" onClick={simularSunat} title="Consultar RUC en SUNAT">
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
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
                    <option>Nuevo RUS</option>
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

          {modalStep === 2 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
                2. PLAN CONTABLE Y AUTOMATIZACIÓN
              </div>

              <div className="form-group">
                <label className="form-label">Modalidad de Plan Contable</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
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

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '20px 0', paddingTop: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={14} /> Plantillas y Automatización Inicial
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <label className="form-checkbox">
                    <input type="checkbox" checked={form.plantillasActivas.compras} onChange={(e) => setForm({...form, plantillasActivas: {...form.plantillasActivas, compras: e.target.checked}})} />
                    <span className="form-checkbox-label">Activar Compras Mercadería</span>
                  </label>
                  <label className="form-checkbox">
                    <input type="checkbox" checked={form.plantillasActivas.ventas} onChange={(e) => setForm({...form, plantillasActivas: {...form.plantillasActivas, ventas: e.target.checked}})} />
                    <span className="form-checkbox-label">Activar Ventas Locales</span>
                  </label>
                  <label className="form-checkbox">
                    <input type="checkbox" checked={form.plantillasActivas.servicios} onChange={(e) => setForm({...form, plantillasActivas: {...form.plantillasActivas, servicios: e.target.checked}})} />
                    <span className="form-checkbox-label">Activar Serv. Terceros</span>
                  </label>
                  <label className="form-checkbox">
                    <input type="checkbox" checked={form.autoAmarres} onChange={(e) => setForm({...form, autoAmarres: e.target.checked})} />
                    <span className="form-checkbox-label">Amarres auto. (Clase 6 a 9/79)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {modalStep === 3 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#475569', margin: '14px 0 10px 0' }}>
                3. RESUMEN Y APERTURA
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>Empresa:</span>
                  <span style={{ fontWeight: 600, fontSize: '12px' }}>{form.razonSocial || '(No definida)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>RUC:</span>
                  <span style={{ fontWeight: 600, fontSize: '12px', fontFamily: 'monospace' }}>{form.ruc || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>Régimen:</span>
                  <span style={{ fontWeight: 500, fontSize: '12px' }}>{form.regimen}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>Catálogo:</span>
                  <span style={{ fontWeight: 500, fontSize: '12px', color: '#2563EB' }}>
                    {form.modoInicializacion === 'PCGE_2026' ? 'PCGE 2026 Oficial' : form.modoInicializacion === 'IMPORTAR_EXCEL' ? `Excel (${form.planPersonalizado.length} Ctas)` : 'En Blanco'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>Plantillas:</span>
                  <span style={{ fontWeight: 500, fontSize: '12px' }}>
                    {Object.values(form.plantillasActivas).filter(Boolean).length} activas
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: '16px', fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> Todo listo para aperturar el entorno operativo de la empresa.
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
