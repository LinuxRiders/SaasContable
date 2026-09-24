import React, { useState, useMemo } from 'react';
import { Search, Check, AlertCircle } from 'lucide-react';

export const AccountPicker = ({ chart = [], value, onChange, disabled = false, placeholder = 'Seleccionar cuenta...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    return chart.find(a => a.codigo === value);
  }, [chart, value]);

  const filteredAccounts = useMemo(() => {
    if (!search) return chart.slice(0, 100);
    const term = search.toLowerCase();
    return chart.filter(a =>
      a.codigo.toLowerCase().includes(term) ||
      a.descripcion.toLowerCase().includes(term)
    ).slice(0, 100);
  }, [chart, search]);

  return (
    <div style={{ position: 'relative', width: '100%', minWidth: '220px' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 10px',
          background: disabled ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {selectedAccount ? (
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span className="mono" style={{ fontWeight: 600, marginRight: '6px' }}>{selectedAccount.codigo}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{selectedAccount.descripcion}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>{value || placeholder}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999,
            marginTop: '4px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '6px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por código o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px 4px 28px',
                    fontSize: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
              {filteredAccounts.length === 0 ? (
                <div style={{ padding: '10px', fontSize: '11px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No se encontraron cuentas
                </div>
              ) : (
                filteredAccounts.map(acc => {
                  const isPostable = acc.esCuentaU && acc.activo !== false;
                  const isSelected = acc.codigo === value;

                  return (
                    <div
                      key={acc.codigo}
                      onClick={() => {
                        if (isPostable) {
                          onChange(acc.codigo);
                          setIsOpen(false);
                          setSearch('');
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        cursor: isPostable ? 'pointer' : 'not-allowed',
                        opacity: isPostable ? 1 : 0.45,
                        background: isSelected ? 'var(--color-surface-subtle)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (isPostable) e.currentTarget.style.background = 'var(--color-surface-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        if (isPostable && !isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="mono" style={{ fontWeight: 600, marginRight: '6px' }}>{acc.codigo}</span>
                        <span>{acc.descripcion}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                        {!acc.esCuentaU && (
                          <span className="badge badge--neutral" style={{ fontSize: '9px' }}>Agrupación</span>
                        )}
                        {acc.activo === false && (
                          <span className="badge badge--danger" style={{ fontSize: '9px' }}>Inactiva</span>
                        )}
                        {isSelected && <Check size={14} color="var(--color-primary)" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

