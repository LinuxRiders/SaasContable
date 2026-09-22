import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { auditarPlanContable, autoGenerarCuentasPadre } from '../utils/planContableValidator';
import { AlertCircle, CheckCircle, AlertTriangle, Wand2, Search } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';

export const ModalAuditoriaPlan = ({ isOpen, onClose, rawCuentas }) => {
  const { empresaActiva, aplicarPlanContable } = useAccounting();
  const [cuentas, setCuentas] = useState([]);
  const [auditoria, setAuditoria] = useState(null);
  const [modoAprobacion, setModoAprobacion] = useState('REEMPLAZAR');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (rawCuentas && rawCuentas.length > 0) {
      setCuentas(rawCuentas);
      setAuditoria(auditarPlanContable(rawCuentas));
    }
  }, [rawCuentas]);

  const handleAutogenerarPadres = () => {
    const nuevas = autoGenerarCuentasPadre(cuentas);
    setCuentas(nuevas);
    setAuditoria(auditarPlanContable(nuevas));
  };

  const handleAprobar = () => {
    if (!empresaActiva) return;
    aplicarPlanContable(empresaActiva.id, cuentas, modoAprobacion);
    onClose();
  };

  if (!auditoria) return null;

  let semaforo = 'success';
  let colorBadge = '#10B981';
  if (auditoria.alertas.some(a => a.tipo === 'error')) {
    semaforo = 'error';
    colorBadge = '#EF4444';
  } else if (auditoria.alertas.some(a => a.tipo === 'warning')) {
    semaforo = 'warning';
    colorBadge = '#F59E0B';
  }

  const filteredCuentas = cuentas.filter(c => 
    c.codigo.includes(searchTerm) || c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Auditoría de Plan Contable"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Modo de Aplicación:</span>
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '13px' }}
              value={modoAprobacion}
              onChange={(e) => setModoAprobacion(e.target.value)}
            >
              <option value="REEMPLAZAR">[Reemplazo Total] Borrar actual y usar este</option>
              <option value="FUSIONAR">[Fusión / Merge] Mantener actuales y agregar nuevas</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn--secondary" onClick={onClose}>
              ❌ Descartar
            </button>
            <button 
              className="btn btn--primary" 
              onClick={handleAprobar}
              disabled={semaforo === 'error'}
              style={semaforo === 'error' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <CheckCircle size={16} /> Aprobar y Aplicar Plan
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cuentas Leídas</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-color)' }}>{auditoria.totalCuentas}</div>
          </div>
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cuentas de Registro (U)</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-color)' }}>{auditoria.cuentasU}</div>
          </div>
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Amarres Válidos</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-color)' }}>{auditoria.amarresValidos}</div>
          </div>
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: semaforo === 'success' ? '#ecfdf5' : semaforo === 'warning' ? '#fffbeb' : '#fef2f2' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Estado de Integridad</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colorBadge, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colorBadge, display: 'inline-block' }}></span>
              {semaforo === 'success' ? 'ÓPTIMO' : semaforo === 'warning' ? 'OBSERVADO' : 'INCONSISTENTE'}
            </div>
          </div>
        </div>

        {/* Alertas */}
        {auditoria.alertas.map((alerta, idx) => (
          <div key={idx} style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            backgroundColor: alerta.tipo === 'error' ? '#fef2f2' : alerta.tipo === 'warning' ? '#fffbeb' : '#ecfdf5',
            border: `1px solid ${alerta.tipo === 'error' ? '#fecaca' : alerta.tipo === 'warning' ? '#fde68a' : '#a7f3d0'}`,
            color: alerta.tipo === 'error' ? '#991b1b' : alerta.tipo === 'warning' ? '#92400e' : '#065f46',
            fontSize: '13px',
            fontWeight: 500
          }}>
            {alerta.tipo === 'error' ? <AlertCircle size={16} /> : alerta.tipo === 'warning' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {alerta.mensaje}
            
            {alerta.tipo === 'error' && auditoria.cuentasHuerfanas.length > 0 && (
              <button 
                onClick={handleAutogenerarPadres}
                className="btn btn--primary" 
                style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', fontSize: '11px' }}
              >
                <Wand2 size={12} /> Autogenerar Padres Sintéticos
              </button>
            )}
          </div>
        ))}

        {/* Tabla de Preview */}
        <div style={{ marginTop: '1rem' }}>
          <div className="toolbar__search" style={{ width: '100%', marginBottom: '1rem' }}>
            <Search size={14} className="toolbar__search-icon" />
            <input 
              type="text" 
              placeholder="Buscar cuenta para previsualizar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: '100px' }}>Cuenta</th>
                  <th>Descripción</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Tipo</th>
                  <th style={{ width: '120px' }}>Análisis</th>
                  <th style={{ width: '120px' }}>Amarres (D/H)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCuentas.slice(0, 100).map(c => (
                  <tr key={c.codigo}>
                    <td className="mono font-bold" style={{ color: c.esCuentaU ? '#2563EB' : '#0F172A' }}>{c.codigo}</td>
                    <td style={{ fontWeight: c.esCuentaU ? 400 : 600 }}>{c.descripcion}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.esCuentaU ? (
                        <span className="badge badge--success" style={{ padding: '2px 6px', fontSize: '10px' }}>Uso</span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', fontSize: '10px' }}>Padre</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>{c.tipoAnalisis}</td>
                    <td className="mono" style={{ fontSize: '11px', color: '#64748b' }}>
                      {c.amarre1 && <span>D:{c.amarre1}</span>}
                      {c.amarre2 && <span style={{ marginLeft: '4px' }}>H:{c.amarre2}</span>}
                    </td>
                  </tr>
                ))}
                {filteredCuentas.length > 100 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '0.75rem', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ... y {filteredCuentas.length - 100} cuentas más. Use el buscador.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
