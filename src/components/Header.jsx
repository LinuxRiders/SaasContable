import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Building2, Calendar, ArrowLeft, Terminal } from 'lucide-react';

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

      <div className="header__right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          className="mono header__date-badge" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '11.5px', 
            color: '#64748B',
            background: 'var(--bg-subtle)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-light)'
          }}
          title="Fecha del sistema"
        >
          <Calendar size={13} />
          <span>{new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>
    </header>
  );
};
