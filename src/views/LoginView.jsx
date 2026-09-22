import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Lock, User, Building, LogIn, Server, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';

export const LoginView = () => {
  const { iniciarSesion } = useAccounting();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [codigoEstudio, setCodigoEstudio] = useState('ESTUDIO-01');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usuario || !password || !codigoEstudio) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    const exitoso = iniciarSesion(usuario, password, codigoEstudio);
    if (!exitoso) {
      setError("Credenciales incorrectas. Verifique y vuelva a intentar.");
    }
  };

  const handleDemoLogin = (role) => {
    if (role === 'admin') {
      iniciarSesion("admin_pedro", "123456", "ESTUDIO-01");
    } else {
      iniciarSesion("contador_maria", "123456", "ESTUDIO-01");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8fafc', fontFamily: 'var(--font-family)' }}>
      
      {/* LEFT COLUMN: BRANDING & WELCOME */}
      <div style={{ 
        flex: 1, 
        backgroundColor: '#1e293b', 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(30,41,59,0) 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(30,41,59,0) 70%)', borderRadius: '50%' }}></div>

        <div style={{ zIndex: 1, maxWidth: '500px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2rem', backdropFilter: 'blur(4px)' }}>
            <ShieldCheck size={14} color="#10B981" />
            Acceso Seguro Multi-Estudio v2.4
          </div>
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0 0 1rem 0', letterSpacing: '-1px', lineHeight: 1.1 }}>
            Contable<span style={{ color: '#3b82f6' }}>OS</span>
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: '0 0 3rem 0', lineHeight: 1.5 }}>
            El sistema integral contable en la nube diseñado para maximizar la productividad de tu estudio. Control total de múltiples empresas, bajo un solo panel.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: '12px', color: '#60a5fa' }}>
                <Building size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#f8fafc' }}>Gestión Multi-Empresa</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Navega entre las contabilidades de tus clientes al instante.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: '12px', color: '#34d399' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#f8fafc' }}>Plan Contable Inteligente</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Amarres automáticos y estructuras 100% alineadas al PCGE.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem' 
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '420px', 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '2.5rem', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Iniciar Sesión</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fca5a5', 
              borderRadius: '8px', 
              color: '#b91c1c', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <Lock size={18} />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Código del Estudio</label>
              <div style={{ position: 'relative' }}>
                <Server size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  value={codigoEstudio} 
                  onChange={(e) => setCodigoEstudio(e.target.value)} 
                  placeholder="Ej. ESTUDIO-01"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Usuario</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  value={usuario} 
                  onChange={(e) => setUsuario(e.target.value)} 
                  placeholder="ej. admin_pedro"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="password" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              style={{ 
                marginTop: '1rem', 
                width: '100%', 
                padding: '0.85rem', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '1rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              Ingresar al Sistema
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Accesos Rápidos Demo</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => handleDemoLogin('admin')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem', 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                    AP
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Admin Pedro</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Administrador del Estudio</div>
                  </div>
                </div>
                <LogIn size={16} color="#94a3b8" />
              </button>

              <button 
                type="button" 
                onClick={() => handleDemoLogin('maker')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem', 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                    CM
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Contador María</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Contador Maker</div>
                  </div>
                </div>
                <LogIn size={16} color="#94a3b8" />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
