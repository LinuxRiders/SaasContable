import React from 'react';

export const MetricCard = ({ title, value, subtext, badgeText, badgeType = 'neutral', icon: Icon }) => {
  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={12} color="#64748B" />}
          <span className="metric-card__title">{title}</span>
        </div>
        {badgeText && (
          <span className={`badge badge--${badgeType}`}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="metric-card__value mono">{value}</div>
      {subtext && <div className="metric-card__sub mono">{subtext}</div>}
    </div>
  );
};
