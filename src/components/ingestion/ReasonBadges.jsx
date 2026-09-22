import React from 'react';

/**
 * Configuración visual y descriptiva de cada motivo de excepción en bandeja.
 * Basado en data-model.md §3 y theme.css.
 */
export const REASON_CONFIG = {
  UNBALANCED: {
    label: 'Descuadre',
    variant: 'badge--danger',
    description: 'La suma de débitos no coincide con la suma de créditos.'
  },
  INCONSISTENT_AMOUNTS: {
    label: 'Montos inconsistentes',
    variant: 'badge--danger',
    description: 'La base gravada y el IGV no suman el total del comprobante.'
  },
  PERIOD_CLOSED: {
    label: 'Periodo cerrado o no abierto',
    variant: 'badge--warning',
    description: 'El periodo contable de emisión está cerrado o no existe en la empresa.'
  },
  TEMPLATE_MISMATCH: {
    label: 'Plantilla no corresponde',
    variant: 'badge--warning',
    description: 'El tipo de operación del documento no corresponde con la plantilla seleccionada.'
  },
  MISSING_COST_CENTER: {
    label: 'Falta centro de costo',
    variant: 'badge--info',
    description: 'Una o más cuentas de gasto requieren centro de costo obligatorio.'
  },
  ACCOUNT_NOT_FOUND: {
    label: 'Cuenta inexistente',
    variant: 'badge--danger',
    description: 'Una cuenta configurada en la plantilla no existe en el catálogo de la empresa.'
  },
  ACCOUNT_NOT_POSTABLE: {
    label: 'Cuenta no imputable',
    variant: 'badge--warning',
    description: 'Una cuenta configurada no es de uso (imputable) en el plan contable.'
  },
  NO_FX_RATE: {
    label: 'Sin tipo de cambio',
    variant: 'badge--info',
    description: 'Comprobante en moneda extranjera sin tasa de cambio registrada para su fecha.'
  },
  TEMPLATE_INACTIVE: {
    label: 'Plantilla no activa',
    variant: 'badge--warning',
    description: 'La plantilla no tiene una versión activa o fue desactivada para la empresa.'
  }
};

/**
 * Componente para renderizar una o más insignias de motivos de pendientes.
 *
 * @param {Object} props
 * @param {string[]|string} [props.reasons]
 * @param {string} [props.className]
 */
export default function ReasonBadges({ reasons = [], className = '' }) {
  const reasonList = Array.isArray(reasons) ? reasons : [reasons].filter(Boolean);

  if (!reasonList || reasonList.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }} className={className}>
      {reasonList.map((reason) => {
        const config = REASON_CONFIG[reason] || {
          label: reason,
          variant: 'badge--neutral',
          description: reason
        };

        return (
          <span
            key={reason}
            className={`badge ${config.variant}`}
            title={config.description}
            style={{ textTransform: 'none', letterSpacing: 'normal' }}
          >
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

