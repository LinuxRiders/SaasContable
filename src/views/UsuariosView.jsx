import React, { useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { Users, Plus, ShieldCheck, ShieldAlert, CheckCircle2, Search } from 'lucide-react';

export const UsuariosView = () => {
  const [usuarios, setUsuarios] = useState([
    {
      id: "U-01",
      nombre: "Dra. Sofía Alva Carrión",
      correo: "sofia.alva@consorciocontable.pe",
      documento: "DNI 41238901",
      rol: "Titular del estudio / Administrador",
      empresasAsignadas: "Todas las Empresas (5)",
      autenticacion2FA: true,
      estado: "ACTIVO",
      ultimaActividad: "Hoy, 17:15"
    },
    {
      id: "U-02",
      nombre: "Juan Carlos Barrenechea",
      correo: "carlos.barrenechea@consorciocontable.pe",
      documento: "DNI 09876543",
      rol: "Contador Aprobador",
      empresasAsignadas: "Maralesa, Inti Punku (+2)",
      autenticacion2FA: true,
      estado: "ACTIVO",
      ultimaActividad: "Hoy, 16:30"
    },
    {
      id: "U-03",
      nombre: "Lucía Fernández Quispe",
      correo: "lucia.fernandez@consorciocontable.pe",
      documento: "DNI 72345678",
      rol: "Asistente Registro",
      empresasAsignadas: "Maralesa, Textil Andina",
      autenticacion2FA: true,
      estado: "ACTIVO",
      ultimaActividad: "Hoy, 14:10"
    },
    {
      id: "U-04",
      nombre: "Diego Alonso Pari",
      correo: "diego.pari@consorciocontable.pe",
      documento: "DNI 74561230",
      rol: "Asistente Registro",
      empresasAsignadas: "Gastronomía & Sabores",
      autenticacion2FA: false,
      estado: "INVITACIÓN",
      ultimaActividad: "Nunca"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    documento: '',
    rol: 'Asistente Registro',
    empresa: 'Pachatusantrek SAC'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre || !form.correo) return;

    setUsuarios(prev => [
      ...prev,
      {
        id: `U-0${prev.length + 1}`,
        nombre: form.nombre,
        correo: form.correo,
        documento: form.documento || 'DNI 00000000',
        rol: form.rol,
        empresasAsignadas: form.empresa,
        autenticacion2FA: true,
        estado: 'ACTIVO',
        ultimaActividad: 'Recién creado'
      }
    ]);

    setIsModalOpen(false);
    setForm({
      nombre: '',
      correo: '',
      documento: '',
      rol: 'Asistente Registro',
      empresa: 'Pachatusantrek SAC'
    });
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-body">
      {/* METRICAS (FIGMA 80-2) */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Colaboradores" 
          value={usuarios.length} 
          subtext="18 de 25 licencias utilizadas" 
          badgeText="Equipo" 
          badgeType="info" 
        />
        <MetricCard 
          title="Usuarios Activos" 
          value={usuarios.filter(u => u.estado === 'ACTIVO').length} 
          subtext="Con acceso operativo directo" 
          badgeText="Operativos" 
          badgeType="success" 
        />
        <MetricCard 
          title="Control SoD (Segregación)" 
          value="ACTIVO" 
          subtext="Bloqueo: Asistente no puede auto-aprobar" 
          badgeText="Seguridad" 
          badgeType="warning" 
        />
        <MetricCard 
          title="Doble Factor (2FA)" 
          value="95%" 
          subtext="Autenticación de seguridad requerida" 
          badgeText="Protegido" 
          badgeType="success" 
        />
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={14} className="toolbar__search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o rol..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar__spacer"></div>

        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> Invitar Colaborador
          <span className="btn__badge">F2</span>
        </button>
      </div>

      {/* TABLA DE USUARIOS (FIGMA 80-2) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Colaborador / Correo</th>
              <th style={{ width: '130px' }}>Documento</th>
              <th>Rol en el Estudio</th>
              <th>Cartera de Empresas</th>
              <th style={{ width: '80px' }} className="text-center">2FA</th>
              <th style={{ width: '100px' }} className="text-center">Estado</th>
              <th style={{ width: '120px' }}>Última Actividad</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.nombre}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{u.correo}</div>
                </td>
                <td className="mono">{u.documento}</td>
                <td>
                  <span style={{ fontWeight: 600, color: u.rol.includes('Aprobador') ? '#10B981' : '#2563EB' }}>
                    {u.rol}
                  </span>
                </td>
                <td style={{ fontSize: '12px' }}>{u.empresasAsignadas}</td>
                <td className="text-center">
                  {u.autenticacion2FA ? (
                    <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 600 }}>✓ Activo</span>
                  ) : (
                    <span style={{ color: '#F59E0B', fontSize: '11px' }}>Pendiente</span>
                  )}
                </td>
                <td className="text-center">
                  <span className={`badge badge--${u.estado === 'ACTIVO' ? 'success' : 'warning'}`}>
                    {u.estado}
                  </span>
                </td>
                <td style={{ fontSize: '11.5px', color: '#64748B' }}>{u.ultimaActividad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL INVITAR USUARIO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invitar Colaborador al Estudio Contable"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSubmit}>Enviar Invitación</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="callout callout--warning">
            <strong>Segregación de Funciones (SoD):</strong> Un usuario con rol "Asistente Registro" podrá ingresar facturas y armar borradores, pero estará estrictamente bloqueado de aprobar y asentar el mismo comprobante en el Libro Mayor.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required">Nombres y Apellidos</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ej. Carlos Mendoza Prado" 
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">Correo de Acceso</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="carlos@consorciocontable.pe" 
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Documento de Identidad</label>
              <input 
                type="text" 
                className="form-control form-control--mono" 
                placeholder="DNI 00000000" 
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rol en el Estudio</label>
              <select 
                className="form-control"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                <option value="Asistente Registro">Asistente Registro (Solo carga comprobantes)</option>
                <option value="Contador Aprobador">Contador Aprobador (Asienta en Mayor)</option>
                <option value="Auditor Solo Lectura">Auditor Solo Lectura</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
