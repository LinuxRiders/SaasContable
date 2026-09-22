import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAccounting } from '../context/AccountingContext';
import { Copy, Building, CheckCircle } from 'lucide-react';

export const ModalClonarPlan = ({ isOpen, onClose }) => {
  const { empresas, empresaActiva, clonarPlanContable } = useAccounting();
  const [empresaOrigenId, setEmpresaOrigenId] = useState('');
  const [clonado, setClonado] = useState(false);

  // Excluir la empresa activa de la lista de orígenes
  const otrasEmpresas = empresas.filter(e => e.id !== empresaActiva?.id);
  const empresaOrigen = otrasEmpresas.find(e => e.id === empresaOrigenId);

  const handleClonar = () => {
    if (!empresaActiva || !empresaOrigenId) return;
    clonarPlanContable(empresaOrigenId, empresaActiva.id);
    setClonado(true);
    setTimeout(() => {
      setClonado(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Copiar Catálogo de Otra Empresa"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary" onClick={onClose} disabled={clonado}>
            Cancelar
          </button>
          <button 
            className="btn btn--primary" 
            onClick={handleClonar}
            disabled={!empresaOrigenId || clonado}
          >
            {clonado ? <><CheckCircle size={16} /> ¡Clonado Exitoso!</> : <><Copy size={16} /> Clonar Plan Contable</>}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          Esta acción reemplazará el catálogo de cuentas de <strong>{empresaActiva?.razonSocial}</strong> copiando exactamente la estructura de otra empresa del estudio.
        </p>
        
        <div className="form-group">
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Seleccionar Empresa de Origen</label>
          <select 
            className="form-control" 
            value={empresaOrigenId}
            onChange={(e) => setEmpresaOrigenId(e.target.value)}
            disabled={clonado}
          >
            <option value="">-- Seleccione una empresa --</option>
            {otrasEmpresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.ruc} - {emp.razonSocial}</option>
            ))}
          </select>
        </div>

        {empresaOrigen && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Building size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{empresaOrigen.razonSocial}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>RUC: {empresaOrigen.ruc} | {empresaOrigen.cuentasCount} Cuentas Activas</div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
