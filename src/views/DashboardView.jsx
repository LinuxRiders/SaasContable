import React from 'react';
import { useDashboardGeneral } from '../context/DashboardGeneralContext';
import { MetricCardWireframe } from '../components/MetricCardWireframe';
import {
  Wallet,
  Building2,
  Briefcase,
  Users,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Clock,
  TrendingUp,
  Activity,
  Scale,
  Database,
  HardDrive,
  Hexagon,
  Search,
  Filter,
  X,
  FileSpreadsheet,
  LogIn,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';

export const DashboardView = () => {
  const {
    empresaActiva,
    empresas,
    colaboradores,
    accesos,
    setActiveTab,
    currentUser,
    copiasSeguridad,
    periodoActivo,
    estadoPeriodo,
    planContable,
    cuentasParaFiltro,
    cuentaSeleccionada,
    setCuentaSeleccionada,
    elementoSeleccionado,
    setElementoSeleccionado,
    busquedaCuenta,
    setBusquedaCuenta,
    limpiarFiltroCuenta,
    infoCuentaSeleccionada,
    metricasFiltradas,
    movimientosFiltrados
  } = useDashboardGeneral();

  const { seleccionarEmpresaYPeriodo } = useAccounting();

  const elementosPCGE = [
    { num: "", label: "Todos los Elementos (1 - 7)" },
    { num: "1", label: "Elem 1: Activo Disponible y Exigible" },
    { num: "2", label: "Elem 2: Activo Realizable" },
    { num: "3", label: "Elem 3: Activo Inmovilizado" },
    { num: "4", label: "Elem 4: Pasivo" },
    { num: "5", label: "Elem 5: Patrimonio Neto" },
    { num: "6", label: "Elem 6: Gastos por Naturaleza" },
    { num: "7", label: "Elem 7: Ingresos" },
  ];

  // =========================================================================
  // VISTA 1: MODO GLOBAL (ESTUDIO CONTABLE MATRIZ) - SIN EMPRESA SELECCIONADA
  // =========================================================================
  if (!empresaActiva) {
    const totalEmpresasActivas = (empresas || []).filter(e => e.estado === 'ACTIVA').length;
    const totalUsuariosActivos = (colaboradores || []).length;

    return (
      <div className="content-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* BANNER PRINCIPAL ESTUDIO GLOBAL */}
        <div
          className="wf-card"
          style={{
            borderLeft: '4px solid var(--color-primary)',
            backgroundColor: '#FFFFFF',
            padding: '18px 22px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xs)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge--neutral" style={{ fontWeight: '700', padding: '2px 8px' }}>
                  <Hexagon size={11} /> ESTUDIO CONTABLE MATRIZ :: CONSOLA GLOBAL
                </span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ARQUITECTURA MULTITENANT AISLADA
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0', color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
                Tablero Central de Administración
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, maxWidth: '820px', lineHeight: '1.4' }}>
                Vista consolidada de cartera de contribuyentes, segregación de funciones (SoD), estado de copias de seguridad y catálogo maestro de tablas normativas SUNAT.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span className="badge badge--info" style={{ padding: '3px 8px', fontSize: '11px' }}>
                ESTUDIO: ASOCIADOS S.A.C.
              </span>
              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                SESIÓN: {currentUser?.nombre} ({currentUser?.rolPrincipal})
              </span>
            </div>
          </div>
        </div>

        {/* CALLOUT INFORMATIVO: SELECCIÓN DE EMPRESA PARA HABILITAR FILTRO PCGE */}
        <div 
          className="callout"
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            margin: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BookOpen size={16} />
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-primary)' }}>
                Filtro por Catálogo de Cuentas (PCGE 2026)
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Para consultar los saldos deudores/acreedores, filtrar por cuentas contables y revisar los libros analíticos de una compañía, selecciona una empresa de la cartera.
              </div>
            </div>
          </div>

          <button
            className="btn btn--primary btn--sm"
            onClick={() => setActiveTab('empresas')}
            style={{ padding: '6px 14px', gap: '6px' }}
          >
            <span>Ver Cartera de Empresas</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* MÉTRICAS GLOBALES DEL ESTUDIO */}
        <div className="wf-grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <MetricCardWireframe
            label="Empresas en Cartera"
            value={String(empresas?.length || 0)}
            subtext={`${totalEmpresasActivas} empresas operativas`}
            icon={Building2}
            trend="up"
            trendValue="100% Habidas"
            code="KPI-EST-01"
          />
          <MetricCardWireframe
            label="Usuarios y Roles"
            value={String(totalUsuariosActivos)}
            subtext="Colaboradores con acceso RBAC"
            icon={Users}
            trend="neutral"
            trendValue="Segregación Maker/Checker"
            code="KPI-EST-02"
          />
          <MetricCardWireframe
            label="Respaldos del Sistema"
            value={`${copiasSeguridad?.length || 0} Snapshots`}
            subtext="Copias atómicas con SHA-256"
            icon={HardDrive}
            trend="neutral"
            trendValue="Verificados [✓]"
            code="KPI-EST-03"
          />
          <MetricCardWireframe
            label="Conexión SUNAT"
            value="OPERATIVO"
            subtext="Tablas maestras sincronizadas"
            icon={Database}
            trend="up"
            trendValue="En Línea"
            code="KPI-EST-04"
          />
        </div>

        {/* CARTERA RÁPIDA DE EMPRESAS */}
        <div className="wireframe-card" style={{ margin: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <Building2 size={15} />
              <span>Acceso Directo a Compañías Usuarias</span>
            </div>
            <button className="btn btn--secondary btn--sm" onClick={() => setActiveTab('empresas')}>
              Gestionar Cartera Completa
            </button>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {(empresas || []).map((emp) => (
                <div
                  key={emp.id}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span className="mono badge badge--neutral" style={{ fontSize: '10px' }}>RUC: {emp.ruc}</span>
                      <span className={`badge ${emp.estado === 'ACTIVA' ? 'badge--info' : 'badge--neutral'}`} style={{ fontSize: '10px' }}>
                        {emp.estado}
                      </span>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>
                      {emp.abreviatura || emp.razonSocial}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {emp.regimen}
                    </div>
                  </div>

                  <button
                    className="btn btn--secondary btn--sm"
                    style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: '11.5px' }}
                    onClick={() => {
                      const currentYear = new Date().getFullYear().toString();
                      seleccionarEmpresaYPeriodo(emp.id, currentYear, `ENERO_${currentYear}`, 'ABIERTO');
                      setActiveTab('dashboard');
                    }}
                  >
                    <span>Ingresar a la Empresa</span>
                    <LogIn size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: MODO EMPRESA ACTIVA - CON FILTRO HORIZONTAL POR CATÁLOGO PCGE
  // =========================================================================
  return (
    <div className="content-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* BANNER PRINCIPAL DE LA EMPRESA ACTIVA */}
      <div
        className="wf-card"
        style={{
          borderLeft: '4px solid var(--color-primary)',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge--neutral" style={{ fontWeight: '700', padding: '2px 8px' }}>
                <Hexagon size={11} /> TABLERO DE CONTROL :: EMPRESA ACTIVA
              </span>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                PLAN CONTABLE PCGE 2026 ({planContable?.length || 120} CUENTAS)
              </span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', margin: '4px 0', color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              {empresaActiva.razonSocial}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, maxWidth: '800px', lineHeight: '1.4' }}>
              Consola analítica de la empresa: utiliza el filtro horizontal para analizar saldos, débitos, créditos y vouchers por cuenta contable.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span className="badge badge--info" style={{ padding: '3px 8px', fontSize: '11px' }}>
              RUC: {empresaActiva.ruc}
            </span>
            <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              PERÍODO: {periodoActivo || '2026-01'} | ESTADO: {estadoPeriodo || 'ABIERTO'}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTRO HORIZONTAL POR CATÁLOGO DE CUENTAS (DISEÑO ESPACIOSO A LO ANCHO) */}
      <div 
        className="filter-bar"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          margin: 0,
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--color-primary)" />
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary)' }}>
              Filtro por Catálogo de Cuentas (PCGE 2026):
            </span>
            {cuentaSeleccionada && (
              <span className="badge badge--info mono" style={{ fontSize: '10.5px' }}>
                FILTRADO: CTA [{cuentaSeleccionada}]
              </span>
            )}
          </div>

          {(cuentaSeleccionada || elementoSeleccionado || busquedaCuenta) && (
            <button
              onClick={limpiarFiltroCuenta}
              className="btn btn--secondary btn--sm"
              style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
              title="Restablecer a vista consolidada"
            >
              <X size={12} />
              <span>Limpiar Filtro</span>
            </button>
          )}
        </div>

        {/* CONTROLES ALINEADOS HORIZONTALMENTE CON ANCHO COMPLETO */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(340px, 2fr) minmax(220px, 1.2fr)', 
            gap: '16px',
            alignItems: 'flex-end',
            width: '100%'
          }}
        >
          {/* 1. Selector de Elemento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="form-label" style={{ fontSize: '10px', marginBottom: 0 }}>Elemento PCGE:</label>
            <select
              className="form-control mono"
              style={{ padding: '7px 10px', fontSize: '12px', height: '35px' }}
              value={elementoSeleccionado}
              onChange={(e) => {
                setElementoSeleccionado(e.target.value);
                setCuentaSeleccionada('');
              }}
            >
              {elementosPCGE.map((elem) => (
                <option key={elem.num} value={elem.num}>
                  {elem.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selector de Cuenta Contable (Espacio Amplio para Nombres Largos) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="form-label" style={{ fontSize: '10px', marginBottom: 0 }}>Cuenta Contable:</label>
            <select
              className="form-control mono"
              style={{ padding: '7px 10px', fontSize: '12px', height: '35px' }}
              value={cuentaSeleccionada}
              onChange={(e) => setCuentaSeleccionada(e.target.value)}
            >
              <option value="">-- [Todas las Cuentas - Vista Consolidada] --</option>
              {cuentasParaFiltro.map((cta) => (
                <option key={cta.codigo} value={cta.codigo}>
                  {cta.codigo} - {cta.descripcion} {cta.esCuentaU ? '(*)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Búsqueda Rápida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="form-label" style={{ fontSize: '10px', marginBottom: 0 }}>Búsqueda en Catálogo:</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar código o nombre..."
                style={{ paddingLeft: '30px', padding: '7px 10px 7px 30px', fontSize: '12px', height: '35px' }}
                value={busquedaCuenta}
                onChange={(e) => setBusquedaCuenta(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ACCESOS DIRECTOS A CUENTAS CLAVE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--border-light)', marginTop: '4px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Cuentas Frecuentes:</span>
          {[
            { code: '101', label: '101 Caja' },
            { code: '104101', label: '104101 BCP Cta Cte' },
            { code: '104102', label: '104102 BBVA Cta Cte' },
            { code: '1212101', label: '121 Facturas x Cobrar' },
            { code: '4011101', label: '4011 IGV' },
            { code: '4212101', label: '421 Facturas x Pagar' },
            { code: '601101', label: '601 Compras' },
            { code: '701201', label: '701 Ventas' }
          ].map((quick) => {
            const isSelected = cuentaSeleccionada === quick.code;
            return (
              <button
                key={quick.code}
                onClick={() => setCuentaSeleccionada(isSelected ? '' : quick.code)}
                className={`badge mono ${isSelected ? 'badge--info' : 'badge--neutral'}`}
                style={{
                  cursor: 'pointer',
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: isSelected ? '700' : '500',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-light)'
                }}
              >
                {quick.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DETALLE DE CUENTA SELECCIONADA (SI HAY FILTRO ACTIVO) */}
      {infoCuentaSeleccionada && (
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-primary)'
            }}>
              E{infoCuentaSeleccionada.elemento}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontWeight: '800', fontSize: '13px', color: 'var(--color-primary)' }}>
                  CTA {infoCuentaSeleccionada.codigo}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                  — {infoCuentaSeleccionada.descripcion}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }} className="mono">
                Naturaleza: {metricasFiltradas.naturaleza} | Moneda: {infoCuentaSeleccionada.moneda || 'MN'} | Tipo: {infoCuentaSeleccionada.esCuentaU ? 'Cuenta Analítica de Registro' : 'Cuenta de Nivel / Grupo'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge--neutral mono">
              {movimientosFiltrados.length} Movimientos Asociados
            </span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setActiveTab('plan')}
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              <FileSpreadsheet size={12} />
              <span>Ver en Catálogo PCGE</span>
            </button>
          </div>
        </div>
      )}

      {/* KPIS PRINCIPALES DINÁMICOS SEGÚN FILTRO DE CUENTA */}
      <div className="wf-grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <MetricCardWireframe
          label={metricasFiltradas.labelPrincipal}
          value={`S/ ${metricasFiltradas.valorPrincipal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext={metricasFiltradas.subtextPrincipal}
          icon={Wallet}
          trend={metricasFiltradas.valorPrincipal >= 0 ? 'up' : 'down'}
          trendValue={metricasFiltradas.isFiltered ? `Saldo Actual` : `Disponible`}
          code="KPI-CTA-01"
        />
        <MetricCardWireframe
          label="Total Débitos (Debe)"
          value={`S/ ${metricasFiltradas.totalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext="Entradas / Cargos contables"
          icon={TrendingUp}
          trend="up"
          trendValue="Cargos (+)"
          code="KPI-CTA-02"
        />
        <MetricCardWireframe
          label="Total Créditos (Haber)"
          value={`S/ ${metricasFiltradas.totalHaber.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext="Salidas / Abonos contables"
          icon={Scale}
          trend="down"
          trendValue="Abonos (-)"
          code="KPI-CTA-03"
        />
        <MetricCardWireframe
          label="Asientos Contables"
          value={`${metricasFiltradas.countMovimientos} Reg.`}
          subtext={cuentaSeleccionada ? `En cuenta ${cuentaSeleccionada}` : "En todas las cuentas"}
          icon={HardDrive}
          trend="neutral"
          trendValue="Verificados"
          code="KPI-CTA-04"
        />
      </div>

      {/* TABLA DE MOVIMIENTOS CONTABLES FILTRADOS */}
      <div className="wireframe-card" style={{ margin: 0 }}>
        <div className="card-header">
          <div className="card-title">
            <Clock size={14} />
            <span>
              {cuentaSeleccionada 
                ? `Movimientos y Vouchers de la Cuenta [${cuentaSeleccionada}]` 
                : "Últimos Movimientos del Diario & Tesorería"}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mono badge badge--neutral" style={{ fontSize: '10.5px' }}>
              {movimientosFiltrados.length} REGISTROS
            </span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setActiveTab('libros')}
            >
              Ir a Libros Diario / Mayor
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {movimientosFiltrados.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Voucher</th>
                  <th>Cuenta PCGE</th>
                  <th>Glosa / Concepto</th>
                  <th className="text-right">Debe (S/)</th>
                  <th className="text-right">Haber (S/)</th>
                  <th className="text-center">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((trx) => (
                  <tr key={trx.id}>
                    <td className="mono" style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>{trx.fecha}</td>
                    <td className="mono" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      {trx.voucherNumero}
                    </td>
                    <td>
                      <span className="badge badge--neutral mono" style={{ fontSize: '10.5px', cursor: 'pointer' }} onClick={() => setCuentaSeleccionada(trx.cuentaCodigo)}>
                        {trx.cuentaCodigo}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {trx.cuentaDesc}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {trx.concepto}
                    </td>
                    <td className="mono text-right" style={{ fontWeight: trx.debe > 0 ? '700' : '400', color: trx.debe > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                      {trx.debe > 0 ? trx.debe.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="mono text-right" style={{ fontWeight: trx.haber > 0 ? '700' : '400', color: trx.haber > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                      {trx.haber > 0 ? trx.haber.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${trx.tipo === 'DÉBITO' ? 'badge--info' : 'badge--neutral'}`} style={{ fontSize: '10px' }}>
                        {trx.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
              No se encontraron movimientos registrados para la cuenta o filtro seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
