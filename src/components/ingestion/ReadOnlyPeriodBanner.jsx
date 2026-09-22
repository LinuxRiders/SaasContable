import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ReadOnlyPeriodBanner = ({ periodo }) => {
  if (!periodo) return null;
  
  return (
    <div className="callout callout--warning">
      <AlertTriangle size={16} />
      <div>
        <strong>Atención:</strong> El periodo {periodo} está cerrado. La ingestión está en solo lectura.
      </div>
    </div>
  );
};

