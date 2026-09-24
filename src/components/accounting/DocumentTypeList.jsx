import React, { useState, useMemo } from 'react';
import { Search, Eye, Filter } from 'lucide-react';

export const DocumentTypeList = ({ documentTypes = [], onSelect }) => {
  const [filterFamily, setFilterFamily] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const families = useMemo(() => {
    const set = new Set(documentTypes.map(d => d.family).filter(Boolean));
    return Array.from(set).sort();
  }, [documentTypes]);

  const filtered = useMemo(() => {
    return documentTypes.filter(d => {
      if (filterFamily !== 'ALL' && d.family !== filterFamily) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(term);
        const matchesCode = d.code.toLowerCase().includes(term);
        const matchesOfficial = (d.officialCodes || []).some(c => c.toLowerCase().includes(term));
        if (!matchesName && !matchesCode && !matchesOfficial) return false;
      }
      return true;
    });
  }, [documentTypes, filterFamily, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Controles de filtro */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre, código o código oficial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-text-muted)" />
          <select
            className="input"
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="ALL">Todas las familias ({documentTypes.length})</option>
            {families.map(fam => (
              <option key={fam} value={fam}>{fam}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-responsive" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Tipo de Documento</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Familia</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Códigos Oficiales</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Perspectivas</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>Genera Asiento</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Libro Sugerido</th>
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No se encontraron tipos de documento con los criterios especificados.
                </td>
              </tr>
            ) : (
              filtered.map(doc => (
                <tr key={doc.code} style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => onSelect && onSelect(doc)}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{doc.name}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{doc.code}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="badge badge--neutral">{doc.family}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {doc.officialCodes && doc.officialCodes.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {doc.officialCodes.map(code => (
                          <span key={code} className="badge badge--subtle mono">{code}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {doc.allowedPerspectives.map(p => (
                        <span key={p} className="badge badge--primary" style={{ fontSize: '10px' }}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {doc.generatesEntry ? (
                      <span className="badge badge--success">Sí</span>
                    ) : (
                      <span className="badge badge--warning">No (Referencia)</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="mono" style={{ fontSize: '12px' }}>{doc.legalBookCode || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect && onSelect(doc);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} />
                      <span>Ver esquema</span>
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

