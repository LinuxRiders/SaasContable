import React from 'react';

export const MetricCard = ({ title, value, subtext, badgeText, badgeType = 'neutral' }) => {
  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <span className="metric-card__title">{title}</span>
        {badgeText && (
          <span className={`badge badge--${badgeType}`}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="metric-card__value mono">{value}</div>
      {subtext && <div className="metric-card__sub">{subtext}</div>}
    </div>
  );
};
