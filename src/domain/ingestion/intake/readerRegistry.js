/**
 * Registro de lectores de comprobantes (Patrón Strategy).
 * Conforme a contracts/domain-api.md §2 y research R-02.
 */

/**
 * Crea un registro de lectores con prioridad según orden de inserción.
 * @param {Array<{ id: string, sourceFormat: string, canHandle: (meta: Object) => boolean, read: Function }>} [readers=[]]
 * @returns {{ select: (meta: Object) => Object|null, getAll: () => Array<Object> }}
 */
export function createReaderRegistry(readers = []) {
  const registered = [...readers];

  return {
    /**
     * Selecciona el primer lector capaz de procesar el comprobante según sus metadatos.
     * @param {Object} meta - Metadatos { sourceFormat, text?, headBytes?, fileName?, mimeType?, schema? }
     * @returns {Object|null} El lector correspondiente o null si ninguno puede manejarlo
     */
    select(meta) {
      for (const reader of registered) {
        if (typeof reader.canHandle === 'function' && reader.canHandle(meta)) {
          return reader;
        }
      }
      return null;
    },

    /**
     * Retorna todos los lectores registrados.
     */
    getAll() {
      return [...registered];
    }
  };
}
