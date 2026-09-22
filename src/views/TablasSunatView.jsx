import React, { useState } from 'react';
import { Search, Table as TableIcon } from 'lucide-react';

export const TablasSunatView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('comprobantes');

  const tablas = {
    comprobantes: [
      { codigo: '01', descripcion: 'Factura' },
      { codigo: '03', descripcion: 'Boleta de Venta' },
      { codigo: '07', descripcion: 'Nota de Crédito' },
      { codigo: '08', descripcion: 'Nota de Débito' },
      { codigo: '09', descripcion: 'Guía de Remisión - Remitente' },
      { codigo: '12', descripcion: 'Ticket o cinta emitido por máquina registradora' },
      { codigo: '14', descripcion: 'Recibo por Honorarios' }
    ],
    monedas: [
      { codigo: 'PEN', descripcion: 'Sol' },
      { codigo: 'USD', descripcion: 'Dólar de los Estados Unidos' },
      { codigo: 'EUR', descripcion: 'Euro' }
    ],
    operaciones: [
      { codigo: '01', descripcion: 'Venta Nacional' },
      { codigo: '02', descripcion: 'Exportación' },
      { codigo: '03', descripcion: 'No Gravada' },
      { codigo: '04', descripcion: 'Anticipo' }
    ]
  };

  const filteredData = tablas[activeTab].filter(item => 
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-body" style={{ padding: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <TableIcon size={24} color="var(--primary-color)" />
          <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Tablas Maestras SUNAT</h2>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${activeTab === 'comprobantes' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('comprobantes')}
          >
            Tipos de Comprobante
          </button>
          <button 
            className={`btn ${activeTab === 'monedas' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('monedas')}
          >
            Monedas
          </button>
          <button 
            className={`btn ${activeTab === 'operaciones' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('operaciones')}
          >
            Tipos de Operación
          </button>
        </div>

        <div className="toolbar" style={{ marginBottom: '1.5rem' }}>
          <div className="toolbar__search" style={{ width: '400px' }}>
            <Search size={14} className="toolbar__search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por código o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Código</th>
              <th>Descripción</th>
              <th style={{ width: '120px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.codigo}>
                <td className="mono font-bold">{item.codigo}</td>
                <td>{item.descripcion}</td>
                <td><span className="badge badge--success">Vigente</span></td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No se encontraron resultados para la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
