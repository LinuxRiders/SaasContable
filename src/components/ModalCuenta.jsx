import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Save, ChevronRight } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';

export const ModalCuenta = ({ isOpen, onClose, cuentaEdit = null }) => {
  const { empresaActiva, guardarCuenta, planContable } = useAccounting();

  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoAnalisis, setTipoAnalisis] = useState('Solo Monto / Sin Análisis');
  const [esCuentaU, setEsCuentaU] = useState(true);
  const [requiereCentroCostos, setRequiereCentroCostos] = useState(false);
  const [ajusteDiferenciaCambio, setAjusteDiferenciaCambio] = useState(false);
  const [moneda, setMoneda] = useState('MN');
  const [amarre1, setAmarre1] = useState('');
  const [amarre2, setAmarre2] = useState('');

  useEffect(() => {
    if (cuentaEdit) {
      setCodigo(cuentaEdit.codigo);
      setDescripcion(cuentaEdit.descripcion);
      setTipoAnalisis(cuentaEdit.tipoAnalisis || 'Solo Monto / Sin Análisis');
      setEsCuentaU(cuentaEdit.esCuentaU !== undefined ? cuentaEdit.esCuentaU : true);
      setRequiereCentroCostos(cuentaEdit.requiereCentroCostos || false);
      setAjusteDiferenciaCambio(cuentaEdit.ajusteDiferenciaCambio || false);
      setMoneda(cuentaEdit.moneda || 'MN');
      setAmarre1(cuentaEdit.amarre1 || '');
      setAmarre2(cuentaEdit.amarre2 || '');
    } else {
      setCodigo('');
      setDescripcion('');
      setTipoAnalisis('Solo Monto / Sin Análisis');
      setEsCuentaU(true);
      setRequiereCentroCostos(false);
      setAjusteDiferenciaCambio(false);
      setMoneda('MN');
      setAmarre1('');
      setAmarre2('');
    }
  }, [cuentaEdit, isOpen]);

  const handleSave = () => {
    if (!codigo || !descripcion) {
      alert("Código y Denominación son obligatorios.");
      return;
    }
    
    // Validación básica de amarres
    if (amarre1 && !planContable.some(c => c.codigo === amarre1)) {
      alert(`El amarre 1 (${amarre1}) no existe en el catálogo.`);
      return;
    }
    if (amarre2 && !planContable.some(c => c.codigo === amarre2)) {
      alert(`El amarre 2 (${amarre2}) no existe en el catálogo.`);
      return;
    }

    const newCuenta = {
      codigo,
      descripcion,
      elemento: parseInt(codigo.charAt(0), 10) || 0,
      nivel: codigo.length,
      tipoAnalisis,
      esCuentaU,
      requiereCentroCostos,
      ajusteDiferenciaCambio,
      moneda,
      amarre1: amarre1 || undefined,
      amarre2: amarre2 || undefined
    };

    guardarCuenta(empresaActiva.id, newCuenta);
    onClose();
  };

  // Determinar jerarquía (Breadcrumb)
  const getBreadcrumbs = () => {
    const crumbs = [];
    if (!codigo) return crumbs;
    for (let i = 1; i <= codigo.length; i++) {
      const pCode = codigo.substring(0, i);
      const parent = planContable.find(c => c.codigo === pCode);
      if (parent && pCode !== codigo) {
        crumbs.push(parent);
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={cuentaEdit ? `Editar Cuenta ${cuentaEdit.codigo}` : 'Nueva Cuenta Contable'}
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={handleSave}>
            <Save size={16} /> Guardar Cuenta
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Breadcrumb jerárquico */}
        {breadcrumbs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
            {breadcrumbs.map((c, i) => (
              <React.Fragment key={c.codigo}>
                <span style={{ fontWeight: 600 }}>{c.codigo}</span> <span style={{ textTransform: 'uppercase' }}>{c.descripcion}</span>
                <ChevronRight size={12} />
              </React.Fragment>
            ))}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{codigo || '?'}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Código Contable</label>
            <input 
              type="text" 
              className="form-control" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
              placeholder="Ej. 104101"
              disabled={!!cuentaEdit} // No editar código si ya existe
            />
          </div>
          <div className="form-group">
            <label>Denominación</label>
            <input 
              type="text" 
              className="form-control" 
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Banco de Crédito del Perú"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipo de Análisis</label>
            <select 
              className="form-control" 
              value={tipoAnalisis}
              onChange={(e) => setTipoAnalisis(e.target.value)}
            >
              <option value="Solo Monto / Sin Análisis">Solo Monto / Sin Análisis</option>
              <option value="Por Documento / RUC">Por Documento / RUC (Ej. 12, 42)</option>
              <option value="Banco / Conciliación">Banco / Conciliación (Ej. 104)</option>
              <option value="Centro de Costos">Centro de Costos (Ej. 63, 65, 94)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Moneda Base</label>
            <select 
              className="form-control" 
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
            >
              <option value="MN">Soles (MN)</option>
              <option value="ME">Dólares (ME)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Amarre 1 (Debe) - Destino</label>
            <input 
              type="text" 
              className="form-control" 
              value={amarre1}
              onChange={(e) => setAmarre1(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
              placeholder="Ej. 9411101"
            />
          </div>
          <div className="form-group">
            <label>Amarre 2 (Haber) - Transferencia</label>
            <input 
              type="text" 
              className="form-control" 
              value={amarre2}
              onChange={(e) => setAmarre2(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
              placeholder="Ej. 7911101"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={esCuentaU}
              onChange={(e) => setEsCuentaU(e.target.checked)}
            />
            Cuenta de Uso (U)
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={requiereCentroCostos}
              onChange={(e) => setRequiereCentroCostos(e.target.checked)}
            />
            Exige Centro de Costo
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={ajusteDiferenciaCambio}
              onChange={(e) => setAjusteDiferenciaCambio(e.target.checked)}
            />
            Ajuste Dif. Cambio
          </label>
        </div>

      </div>
    </Modal>
  );
};
