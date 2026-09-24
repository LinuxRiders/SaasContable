import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, FileCode, CheckCircle2, AlertCircle, Eye, Copy } from 'lucide-react';

export const TemplateList = ({
  templates = [],
  documentTypes = [],
  onSelect,
  onNew,
  canCreate = false,
  showTenantColumns = true
}) => {
  const [filterDocType, setFilterDocType] = useState('ALL');
  const [filterScope, setFilterScope] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (filterDocType !== 'ALL' && t.documentTypeCode !== filterDocType) return false;
      if (filterScope !== 'ALL' && t.scope !== filterScope) return false;
      if (search) {
        const term = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(term);
        const matchesCode = t.code.toLowerCase().includes(term);
        const matchesOp = (t.operationTypeCode || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesOp) return false;
      }
      return true;
    });
  }, [templates, filterDocType, filterScope, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Controles y Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Buscar por código, nombre u operación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              className="input"
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
              style={{ minWidth: '160px', fontSize: '12px' }}
            >
              <option value="ALL">Todos los tipos</option>
              {documentTypes.map(dt => (
                <option key={dt.code} value={dt.code}>{dt.name} ({dt.code})</option>
              ))}
            </select>
          </div>

          <select
            className="input"
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            style={{ minWidth: '130px', fontSize: '12px' }}
          >
            <option value="ALL">Todo alcance</option>
            <option value="PACK">Base (PACK)</option>
            <option value="TENANT">Empresa (TENANT)</option>
          </select>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onNew}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Nueva plantilla</span>
          </button>
        )}
      </div>

      {/* Tabla de plantillas */}
      <div className="table-responsive" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Plantilla / Código</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Terna Contable</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Alcance</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Versión</th>
              {showTenantColumns && (
                <>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Estado en Empresa</th>
                  <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Asientos Generados</th>
                </>
              )}
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No se encontraron plantillas contables con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filtered.map(tpl => (
                <tr
                  key={tpl.id}
                  style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }}
                  onClick={() => onSelect && onSelect(tpl)}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{tpl.code}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge--neutral mono">{tpl.documentTypeCode}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                      <span className="badge badge--primary mono">{tpl.perspective}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                      <span className="badge badge--subtle mono">{tpl.operationTypeCode}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {tpl.scope === 'PACK' ? (
                      <span className="badge badge--primary">PACK</span>
                    ) : (
                      <span className="badge badge--neutral">TENANT</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span className="mono">v{tpl.version}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block' }}>
                      {tpl.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {tpl.activationStatus === 'ACTIVE' ? (
                      <span className="badge badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} /> Activa
                      </span>
                    ) : (
                      <span className="badge badge--warning">Inactiva</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span className="mono">{tpl.usageCount || 0}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect && onSelect(tpl);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={12} />
                      <span>{tpl.scope === 'PACK' ? 'Ver' : 'Editar'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

