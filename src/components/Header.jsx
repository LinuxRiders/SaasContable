import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Building2, Calendar, ShieldCheck, User, LogOut, ArrowLeft } from 'lucide-react';

export const Header = ({ title }) => {
  const { empresaActiva, periodoActivo, estadoPeriodo, sesionUsuario, salirDeEmpresa } = useAccounting();

  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '64px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="header__left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {empresaActiva && (
          <button 
            className="btn btn-secondary" 
            onClick={salirDeEmpresa} 
            title="Salir de la empresa actual"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }}
          >
            <ArrowLeft size={16} />
            Salir de Empresa
          </button>
        )}
        <div>
          <h1 className="header__title" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
            {title}
          </h1>
          
          {empresaActiva ? (
            <div className="header__company-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              <Building2 size={13} color="#2563EB" />
              <span style={{ fontWeight: 500 }}>{empresaActiva.abreviatura || empresaActiva.razonSocial}</span>
              <span className="mono" style={{ color: '#64748B', fontSize: '11px' }}>
                (RUC: {empresaActiva.ruc})
              </span>
              <span style={{ 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '10px', 
                fontWeight: 600, 
                backgroundColor: estadoPeriodo === 'ABIERTO' ? '#dcfce7' : '#fee2e2',
                color: estadoPeriodo === 'ABIERTO' ? '#166534' : '#991b1b'
              }}>
                {periodoActivo} - {estadoPeriodo}
              </span>
            </div>
          ) : (
            <div className="header__company-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Building2 size={13} />
              <span>Modo Global: Estudio Contable ({sesionUsuario?.codigoEstudio})</span>
            </div>
          )}
        </div>
      </div>

      <div className="header__right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
          <Calendar size={13} />
          <span>{new Date().toLocaleDateString('es-PE')}</span>
        </div>
        <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0' }}></div>
        <div className="header__operator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
            fontWeight: '600',
            fontSize: '12px'
          }}>
            {sesionUsuario?.nombre?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A', lineHeight: '1.2' }}>
              {sesionUsuario?.nombre || 'Usuario'}
            </div>
            <div style={{ fontSize: '10.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={11} /> Rol: {sesionUsuario?.rol || 'Staff'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
