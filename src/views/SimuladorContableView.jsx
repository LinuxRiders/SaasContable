import React, { useState, useEffect, useCallback } from 'react';
import { useIngestionContext } from '../hooks/useIngestionContext.js';
import { simulationService, catalogService } from '../services/accounting/index.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { SimulationTrace } from '../components/accounting/SimulationTrace.jsx';
import { FlaskConical, Play, RefreshCw, AlertCircle, FileJson } from 'lucide-react';

// Solo accesible dentro de una empresa (menú "CONFIGURACIÓN EMPRESA"): la simulación
// necesita el mapa de cuentas, las reglas de clasificación y las activaciones reales
// de una empresa concreta; no tiene sentido "global".
export default function SimuladorContableView() {
  const ctx = useIngestionContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pack, setPack] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [customJson, setCustomJson] = useState('');
  const [useCustomJson, setUseCustomJson] = useState(false);
  const [fxRateInput, setFxRateInput] = useState('');

  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);

  const loadData = useCallback(async () => {
    if (!ctx.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [packRes, samplesRes] = await Promise.all([
        catalogService.getJurisdictionPack(ctx),
        simulationService.listSampleDocuments(ctx)
      ]);
      if (!packRes.ok) {
        setError(packRes.error?.message || 'Error al cargar paquete de jurisdicción');
        setLoading(false);
        return;
      }
      setPack(packRes.data);
      if (samplesRes.ok) {
        setSamples(samplesRes.data);
        if (samplesRes.data.length > 0) {
          setSelectedSampleId((prev) => prev || samplesRes.data[0].id);
        }
      } else {
        setError(samplesRes.error?.message || 'Error al cargar documentos de ejemplo');
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al cargar el simulador');
    } finally {
      setLoading(false);
    }
  }, [ctx]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSample = samples.find((s) => s.id === selectedSampleId) || null;

  useEffect(() => {
    if (selectedSample?.suggestedFxRateMilli && !fxRateInput) {
      setFxRateInput(String(selectedSample.suggestedFxRateMilli));
    }
  }, [selectedSample]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSimulate = async () => {
    setSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      let document = null;
      let sampleId = null;

      if (useCustomJson) {
        try {
          document = JSON.parse(customJson);
        } catch (e) {
          setSimulationError('El JSON del documento canónico no es válido: ' + e.message);
          setSimulating(false);
          return;
        }
      } else {
        sampleId = selectedSampleId;
      }

      const fxRateMilli = fxRateInput ? Number(fxRateInput) : null;

      const res = await simulationService.simulateDocument(ctx, { document, sampleId, fxRateMilli });
      if (res.ok) {
        setSimulationResult(res.data);
      } else {
        setSimulationError(res.error?.message || 'Error al simular el documento');
      }
    } finally {
      setSimulating(false);
    }
  };

  const okCount = samples.filter((s) => s.expected?.interpretation === 'PENDING_APPROVAL').length;

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FlaskConical size={24} color="var(--color-primary)" />
            <span>Simulador Contable de Documentos (AST Engine)</span>
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Interpreta un documento de extremo a extremo (esquema → perspectiva → clasificación → selección → evaluación) sin persistir nada.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px',
          borderRadius: 'var(--radius-md)', background: 'var(--color-danger-bg, #FEE2E2)',
          border: '1px solid var(--color-danger-border, #FCA5A5)', color: 'var(--color-danger-text, #991B1B)'
        }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
        <MetricCard
          title="Paquete de Jurisdicción"
          value={pack ? `${pack.name} (${pack.code})` : '—'}
          subtext={pack ? `Versión ${pack.version}` : 'Cargando...'}
          badgeText={pack?.code || 'PE'}
          badgeType="primary"
          icon={FlaskConical}
        />
        <MetricCard
          title="Documentos de Ejemplo"
          value={samples.length}
          subtext="Catálogo de muestra del paquete"
          badgeText="Muestra"
          badgeType="neutral"
          icon={FileJson}
        />
      </div>

      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando simulador...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 'var(--spacing-lg)', alignItems: 'start' }}>
          {/* Panel de entrada */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn--sm ${!useCustomJson ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setUseCustomJson(false)}
                style={{ flex: 1 }}
              >
                Documento de ejemplo
              </button>
              <button
                type="button"
                className={`btn btn--sm ${useCustomJson ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setUseCustomJson(true)}
                style={{ flex: 1 }}
              >
                JSON canónico
              </button>
            </div>

            {!useCustomJson ? (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Documento de ejemplo
                </label>
                <select
                  className="input"
                  value={selectedSampleId}
                  onChange={(e) => setSelectedSampleId(e.target.value)}
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                {selectedSample && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Tipo: <strong>{selectedSample.documentTypeCode}</strong> · Formato: {selectedSample.format}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Documento canónico (JSON)
                </label>
                <textarea
                  className="input"
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  rows={12}
                  placeholder='{"documentTypeCode": "INVOICE", ...}'
                  style={{ width: '100%', marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Tipo de cambio (rateMilli, opcional)
              </label>
              <input
                type="number"
                className="input"
                value={fxRateInput}
                onChange={(e) => setFxRateInput(e.target.value)}
                placeholder="Ej. 3745"
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>

            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSimulate}
              disabled={simulating || (!useCustomJson && !selectedSampleId) || (useCustomJson && !customJson.trim())}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Play size={14} fill="currentColor" />
              <span>{simulating ? 'Simulando...' : 'Simular'}</span>
            </button>

            {simulationError && (
              <div style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger-bg, #FEF2F2)',
                border: '1px solid var(--color-danger-border, #FCA5A5)', color: 'var(--color-danger-text, #991B1B)', fontSize: '12px'
              }}>
                {simulationError}
              </div>
            )}
          </div>

          {/* Traza de simulación */}
          <SimulationTrace result={simulationResult} functionalCurrency={pack?.defaultFunctionalCurrency || 'PEN'} />
        </div>
      )}
    </div>
  );
}
