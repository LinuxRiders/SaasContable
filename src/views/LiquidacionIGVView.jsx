import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { MetricCard } from '../components/MetricCard';
import { Receipt, ArrowRight, CheckCircle2, FileText, Download } from 'lucide-react';

export const LiquidacionIGVView = () => {
  const { compras, ventas, empresaActiva, periodoActivo } = useAccounting();

  // Base y Crédito Fiscal de Compras (Cta 4011 Debe)
  const totalBaseCompras = compras.reduce((acc, c) => acc + c.subtotal, 0);
  const totalCreditoFiscal = compras.reduce((acc, c) => acc + c.igv, 0);

  // Base y Débito Fiscal de Ventas (Cta 4011 Haber)
  const totalBaseVentas = ventas.reduce((acc, v) => acc + v.subtotal, 0);
  const totalDebitoFiscal = ventas.reduce((acc, v) => acc + v.igv, 0);

  // Impuesto Resultante
  const impuestoPorPagar = totalDebitoFiscal - totalCreditoFiscal;
  const tieneSaldoAFavor = impuestoPorPagar < 0;

  return (
    <div className="content-body">
      {/* METRICAS PRINCIPALES */}
      <div className="metrics-grid">
        <MetricCard 
          title="IGV Débito (Cobrado en Ventas)" 
          value={`S/ ${totalDebitoFiscal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext={`Base: S/ ${totalBaseVentas.toFixed(2)}`} 
          badgeText="Haber 4011" 
          badgeType="warning" 
        />
        <MetricCard 
          title="IGV Crédito (Pagado en Compras)" 
          value={`S/ ${totalCreditoFiscal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext={`Base: S/ ${totalBaseCompras.toFixed(2)}`} 
          badgeText="Debe 4011" 
          badgeType="success" 
        />
        <MetricCard 
          title={tieneSaldoAFavor ? "Saldo a Favor del Contribuyente" : "Impuesto Final por Pagar"} 
          value={`S/ ${Math.abs(impuestoPorPagar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          subtext={tieneSaldoAFavor ? "Arrastrable al mes siguiente" : "A pagar a SUNAT"} 
          badgeText={tieneSaldoAFavor ? "Saldo Favor" : "Por Pagar"} 
          badgeType={tieneSaldoAFavor ? "success" : "danger"} 
        />
        <MetricCard 
          title="Libros Electrónicos" 
          value="PLE / SIRE" 
          subtext="Registros RCE y RVIE listos" 
          badgeText="Generado" 
          badgeType="info" 
        />
      </div>

      {/* FORMULA VISUAL DE LIQUIDACIÓN */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E2E8F0', 
        borderRadius: '8px', 
        padding: '24px', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '14px' }}>
          LIQUIDACIÓN OFICIAL DE IGV — PERÍODO FISCAL {periodoActivo}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '16px 24px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>IGV DÉBITO FISCAL (VENTAS)</div>
            <div className="mono font-bold" style={{ fontSize: '22px', color: '#B45309', marginTop: '4px' }}>
              S/ {totalDebitoFiscal.toFixed(2)}
            </div>
          </div>

          <span style={{ fontSize: '24px', fontWeight: 700, color: '#94A3B8' }}>−</span>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px 24px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>IGV CRÉDITO FISCAL (COMPRAS)</div>
            <div className="mono font-bold" style={{ fontSize: '22px', color: '#047857', marginTop: '4px' }}>
              S/ {totalCreditoFiscal.toFixed(2)}
            </div>
          </div>

          <span style={{ fontSize: '24px', fontWeight: 700, color: '#94A3B8' }}>=</span>

          <div style={{ 
            background: tieneSaldoAFavor ? '#ECFDF5' : '#FEF2F2', 
            border: `1px solid ${tieneSaldoAFavor ? '#A7F3D0' : '#FECACA'}`, 
            padding: '16px 24px', 
            borderRadius: '8px' 
          }}>
            <div style={{ fontSize: '11px', color: tieneSaldoAFavor ? '#047857' : '#B91C1C', fontWeight: 600 }}>
              {tieneSaldoAFavor ? "SALDO A FAVOR (MES SIGUIENTE)" : "IMPUESTO FINAL A PAGAR (SUNAT)"}
            </div>
            <div className="mono font-bold" style={{ fontSize: '22px', color: tieneSaldoAFavor ? '#047857' : '#EF4444', marginTop: '4px' }}>
              S/ {Math.abs(impuestoPorPagar).toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button className="btn btn--primary">
            <Download size={13} /> Generar Archivo SIRE (RCE / RVIE)
          </button>
          <button className="btn btn--secondary">
            <FileText size={13} /> Exportar Hoja de Liquidación PDF
          </button>
        </div>
      </div>
    </div>
  );
};
