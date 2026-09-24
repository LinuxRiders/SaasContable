import * as defaultRepo from '../storage/repository.js';
import { ok, fail, authorize } from '../ingestion/serviceKit.js';

const subscribers = new Map();

/**
 * Publica un evento de dominio: lo persiste en `<tenantId>:events` (solo agregado) y
 * notifica a los suscriptores del tipo en una microtarea. Un suscriptor que falla no
 * afecta a los demás ni al publicador.
 * Conforme a contracts/services.md §2.
 *
 * @param {{ tenantId: string, userId?: string, role?: string }} ctx
 * @param {string} type
 * @param {Object} payload
 * @param {{ traceId?: string, id?: string, at?: string, actor?: { userId: string, role: string } }} [options]
 * @param {Object} [repo] - Repositorio inyectado (para pruebas)
 * @returns {Object} El evento persistido
 */
export function publish(ctx, type, payload, options = {}, repo = defaultRepo) {
  const event = {
    id: options.id || crypto.randomUUID(),
    tenantId: ctx.tenantId,
    type,
    at: options.at || new Date().toISOString(),
    traceId: options.traceId || crypto.randomUUID(),
    actor: options.actor || { userId: ctx.userId, role: ctx.role },
    payload: payload || {}
  };

  repo.appendOnly(ctx.tenantId, 'events', [event]);
  notify(event);

  return event;
}

/**
 * Notifica a los suscriptores de un evento ya construido y persistido (por ejemplo,
 * los eventos que arma `runIntake` puro). No vuelve a escribir en `<tenantId>:events`.
 * @param {Object} event - Evento completo { id, tenantId, type, at, traceId, actor, payload }
 */
export function notify(event) {
  const handlers = subscribers.get(event.type);
  if (handlers && handlers.size > 0) {
    for (const handler of [...handlers]) {
      queueMicrotask(() => {
        try {
          const result = handler(event);
          if (result && typeof result.catch === 'function') {
            result.catch((err) => {
              console.error(`[eventBus] Error en suscriptor de '${event.type}':`, err);
            });
          }
        } catch (err) {
          console.error(`[eventBus] Error en suscriptor de '${event.type}':`, err);
        }
      });
    }
  }
}

/**
 * Suscribe un manejador a un tipo de evento.
 * @param {string} type
 * @param {(event: Object) => void|Promise<void>} handler
 * @returns {() => void} Función para cancelar la suscripción
 */
export function subscribe(type, handler) {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set());
  }
  subscribers.get(type).add(handler);

  return () => {
    subscribers.get(type)?.delete(handler);
  };
}

/**
 * Elimina todos los suscriptores (solo para uso en pruebas).
 */
export function clearSubscribers() {
  subscribers.clear();
}

/**
 * Lee el log de eventos de la empresa, opcionalmente filtrado por tipo.
 * @param {{ tenantId: string, userId?: string, role?: string }} ctx
 * @param {{ type?: string, limit?: number }} [params]
 * @param {Object} [repo]
 */
export function listEvents(ctx, { type, limit } = {}, repo = defaultRepo) {
  const authRes = authorize(ctx, 'VIEW_RECEIVED_DOCUMENTS', repo);
  if (!authRes.ok) return authRes;

  let events = repo.readAppendOnly(ctx.tenantId, 'events');
  if (type) {
    events = events.filter((e) => e.type === type);
  }
  if (limit) {
    events = events.slice(-limit);
  }
  return ok(events);
}
