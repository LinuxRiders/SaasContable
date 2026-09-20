import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Building2, Calendar, ShieldCheck, User } from 'lucide-react';

export const Header = ({ title }) => {
  const { empresaActiva, periodoActivo } = useAccounting();

  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">{title}</h1>
        <div className="header__company-tag">
          <Building2 size={13} color="#2563EB" />
          <span>{empresaActiva.abreviatura}</span>
          <span className="mono" style={{ color: '#64748B', fontSize: '11px' }}>
            ({empresaActiva.ruc})
          </span>
        </div>
      </div>

      <div className="header__right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
          <Calendar size={13} />
          <span>02/09/2026</span>
        </div>
        <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0' }}></div>
        <div className="header__operator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
            fontWeight: '600',
            fontSize: '11px'
          }}>
            CA
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A', lineHeight: '1.2' }}>
              C.P. M. Albarracín
            </div>
            <div style={{ fontSize: '10.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={11} /> Contador Aprobador
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
