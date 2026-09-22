import React from 'react';

export const MetricCardWireframe = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  code
}) => {
  return (
    <div className="wf-card wf-metric-card" style={{ padding: '16px 18px', backgroundColor: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && (
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Icon size={15} />
            </div>
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)'
          }}>
            {label}
          </span>
        </div>
        {code && (
          <span className="mono" style={{
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-subtle)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-light)'
          }}>
            {code}
          </span>
        )}
      </div>

      <div className="mono" style={{
        fontSize: '20px',
        fontWeight: '800',
        color: 'var(--color-primary)',
        letterSpacing: '-0.02em',
        marginBottom: '6px'
      }}>
        {value}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
        <span>{subtext}</span>
        {trendValue && (
          <span className="mono" style={{
            fontWeight: '700',
            fontSize: '10.5px',
            padding: '1px 6px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-subtle)',
            color: trend === 'up' ? '#0F172A' : trend === 'down' ? '#0F172A' : '#64748B'
          }}>
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};
