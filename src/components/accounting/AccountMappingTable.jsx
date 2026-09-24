import React, { useState, useEffect, useMemo } from 'react';
import { AccountPicker } from './AccountPicker.jsx';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Save, ShieldAlert, Filter, Search } from 'lucide-react';

export const AccountMappingTable = ({
  pack,
  chart = [],
  mapping,
  impact = [],
  onSave,
  onPreloadSuggestions,
  canEdit = false,
  saving = false
}) => {
  const [entries, setEntries] = useState([]);
  const [filterState, setFilterState] = useState('ALL'); // 'ALL' | 'UNMAPPED' | 'INVALID' | 'BLOCKED'
  const [search, setSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (mapping && mapping.entries) {
      setEntries([...mapping.entries]);
    }
  }, [mapping]);

  // Construir la lista completa de filas requeridas por el paquete (roles + calificadores)
  const rows = useMemo(() => {
    if (!pack || !pack.accountRoles) return [];

    const list = [];
    for (const role of pack.accountRoles) {
      if (role.qualifier?.suggestions) {
        for (const [qualVal, suggestedPrefix] of Object.entries(role.qualifier.suggestions)) {
          const existing = entries.find(e => e.roleCode === role.code && e.qualifier === qualVal);
          list.push({
            roleCode: role.code,
            roleName: role.name,
            roleDescription: role.description,
            suggestedPrefix,
            qualifier: qualVal,
            accountCode: existing ? existing.accountCode : ''
          });
        }
      } else {
        const existing = entries.find(e => e.roleCode === role.code && !e.qualifier);
        list.push({
          roleCode: role.code,
          roleName: role.name,
          roleDescription: role.description,
          suggestedPrefix: role.suggestedAccountCode || '',
          qualifier: null,
          accountCode: existing ? existing.accountCode : ''
        });
      }
    }
    return list;
  }, [pack, entries]);

  // Mapa de impacto por rol
  const impactMap = useMemo(() => {
    const map = new Map();
    for (const item of impact || []) {
      for (const r of item.blockedRoles || []) {
        if (!map.has(r)) map.set(r, []);
        map.get(r).push(item.templateName || item.templateId);
      }
    }
    return map;
  }, [impact]);

  // Manejo de cambio de cuenta en una fila
  const handleAccountChange = (roleCode, qualifier, newAccountCode) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.roleCode === roleCode && (e.qualifier || null) === (qualifier || null));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], accountCode: newAccountCode };
        return copy;
      } else {
        return [...prev, { roleCode, qualifier: qualifier || null, accountCode: newAccountCode }];
      }
    });
  };

  const handlePreload = async () => {
    if (onPreloadSuggestions) {
      const res = await onPreloadSuggestions();
      if (res && res.entries) {
        setEntries(res.entries);
      }
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setValidationErrors([]);
    try {
      await onSave(entries);
    } catch (err) {
      if (err?.details?.errors) {
        setValidationErrors(err.details.errors);
      }
    }
  };

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const blockedTemplates = impactMap.get(r.roleCode) || [];
      const hasAccount = !!r.accountCode;
      const accObj = chart.find(a => a.codigo === r.accountCode);
      const isInvalid = hasAccount && (!accObj || !accObj.esCuentaU || accObj.activo === false);
      const isUnmapped = !hasAccount;

      if (filterState === 'UNMAPPED' && !isUnmapped) return false;
      if (filterState === 'INVALID' && !isInvalid) return false;
      if (filterState === 'BLOCKED' && blockedTemplates.length === 0) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchesRole = r.roleName.toLowerCase().includes(term) || r.roleCode.toLowerCase().includes(term);
        const matchesQual = r.qualifier && r.qualifier.toLowerCase().includes(term);
        const matchesAcc = r.accountCode && r.accountCode.includes(term);
        if (!matchesRole && !matchesQual && !matchesAcc) return false;
      }

      return true;
    });
  }, [rows, filterState, search, impactMap, chart]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Barra superior con resumen y botones */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Mapa de Cuentas Contables por Empresa</h3>
            <span className="badge badge--primary mono">Versión {mapping?.version || 1}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Asigna las cuentas específicas del plan a cada rol normativo exigido por las plantillas contables.
          </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handlePreload}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} color="var(--color-primary)" />
              <span>Precargar sugerencias</span>
            </button>

            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} />
              <span>{saving ? 'Guardando...' : 'Guardar mapa'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Errores de validación generales */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-bg, #FEE2E2)',
          border: '1px solid var(--color-danger-border, #FCA5A5)',
          color: 'var(--color-danger-text, #991B1B)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Errores en el mapa de cuentas:</div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>Rol {err.roleCode}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Buscar por rol, calificador o cuenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} color="var(--color-text-muted)" />
          <select
            className="input"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            style={{ minWidth: '170px' }}
          >
            <option value="ALL">Todos los roles ({rows.length})</option>
            <option value="UNMAPPED">Sin mapear</option>
            <option value="INVALID">Con error / Inválidas</option>
            <option value="BLOCKED">Que bloquean plantillas</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-responsive" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Rol Normativo</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Calificador</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Sugerencia</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', minWidth: '280px' }}>Cuenta Asignada (Plan Empresa)</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Plantillas Afectadas</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No se encontraron roles con el filtro seleccionado.
                </td>
              </tr>
            ) : (
              filteredRows.map(r => {
                const hasAccount = !!r.accountCode;
                const accObj = chart.find(a => a.codigo === r.accountCode);
                const isInvalid = hasAccount && (!accObj || !accObj.esCuentaU || accObj.activo === false);
                const blockedTemplates = impactMap.get(r.roleCode) || [];

                return (
                  <tr key={`${r.roleCode}::${r.qualifier || ''}`} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.roleName}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.roleCode}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {r.qualifier ? (
                        <span className="badge badge--neutral mono">{r.qualifier}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--color-text-muted)' }}>{r.suggestedPrefix}*</span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      {canEdit ? (
                        <AccountPicker
                          chart={chart}
                          value={r.accountCode}
                          onChange={(newCode) => handleAccountChange(r.roleCode, r.qualifier, newCode)}
                        />
                      ) : (
                        <div>
                          <span className="mono" style={{ fontWeight: 600 }}>{r.accountCode || '—'}</span>
                          {accObj && <span style={{ marginLeft: '6px', color: 'var(--color-text-muted)' }}>{accObj.descripcion}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {!hasAccount ? (
                        <span className="badge badge--warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={11} /> Sin mapear
                        </span>
                      ) : isInvalid ? (
                        <span className="badge badge--danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={11} /> Inválida
                        </span>
                      ) : (
                        <span className="badge badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={11} /> Válida
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {blockedTemplates.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {blockedTemplates.map(t => (
                            <span key={t} className="badge badge--danger" style={{ fontSize: '10px' }} title="Plantilla bloqueada por falta de cuenta">{t}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Ninguna</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

