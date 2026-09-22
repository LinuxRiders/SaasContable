import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Building2, Calendar, ShieldCheck, ArrowLeft, Terminal } from 'lucide-react';

export const Header = ({ title }) => {
  const { empresaActiva, periodoActivo, estadoPeriodo, sesionUsuario, salirDeEmpresa } = useAccounting();

  return (
    <header className="header">
      <div className="header__left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {empresaActiva && (
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={salirDeEmpresa} 
            title="Salir de la empresa actual y volver a Cartera"
          >
            <ArrowLeft size={13} />
            <span>Volver a Cartera</span>
          </button>
        )}
        <div>
          <h1 className="header__title">
            {title}
          </h1>
          
          {empresaActiva ? (
            <div className="header__company-tag" style={{ marginTop: '2px' }}>
              <Building2 size={12} color="#0F172A" />
              <span style={{ fontWeight: 700 }}>{empresaActiva.abreviatura || empresaActiva.razonSocial}</span>
              <span className="mono" style={{ color: '#64748B', fontSize: '10.5px' }}>
                [RUC: {empresaActiva.ruc}]
              </span>
              <span className="badge badge--neutral" style={{ padding: '1px 5px', fontSize: '10px' }}>
                PERÍODO: {periodoActivo} | {estadoPeriodo}
              </span>
            </div>
          ) : (
            <div className="header__company-tag" style={{ marginTop: '2px', color: '#64748B' }}>
              <Terminal size={12} color="#64748B" />
              <span>ESTUDIO CONTABLE MATRIZ</span>
              <span className="mono" style={{ fontSize: '10.5px' }}>[{sesionUsuario?.codigoEstudio || 'EST-001'}]</span>
            </div>
          )}
        </div>
      </div>

      <div className="header__right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B' }} className="mono">
          <Calendar size={13} />
          <span>{new Date().toISOString().split('T')[0]}</span>
        </div>
        <div style={{ width: '1px', height: '16px', backgroundColor: '#E2E8F0' }}></div>
        <div className="header__operator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px'
          }}>
            {sesionUsuario?.nombre?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0F172A', lineHeight: '1.2' }}>
              {sesionUsuario?.nombre || 'Administrador'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }} className="mono">
              <ShieldCheck size={10} /> ROL: {sesionUsuario?.rol?.toUpperCase() || 'SUPERVISOR'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
