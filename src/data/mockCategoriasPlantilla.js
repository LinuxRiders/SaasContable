export const CATEGORIAS_PLANTILLA = {
  "TPL-COMPRA-01": "COMPRA_MERCADERIA",
  "TPL-SERV-01": "COMPRA_SERVICIOS",
  "TPL-VENTA-01": "VENTA"
};

export const PLANTILLAS_POR_CATEGORIA = {
  "COMPRA_MERCADERIA": ["PL-01"],
  "COMPRA_SERVICIOS": ["PL-02", "PL-03", "PL-06", "PL-07"],
  "VENTA": ["PL-04", "PL-05"]
};

/**
 * Devuelve la categoría a la que pertenece una plantilla (por id)
 * @param {string} templateId 
 * @returns {string|null}
 */
export function categoriaDePlantilla(templateId) {
  for (const [categoria, plantillas] of Object.entries(PLANTILLAS_POR_CATEGORIA)) {
    if (plantillas.includes(templateId)) {
      return categoria;
    }
  }
  return null;
}

/**
 * Devuelve los IDs de plantillas activadas según los IDs activos de la empresa
 * @param {string[]} plantillasActivasIds
 * @returns {string[]}
 */
export function templateIdsForActiveIds(plantillasActivasIds = []) {
  if (!plantillasActivasIds || plantillasActivasIds.length === 0) return [];
  const result = new Set();
  for (const activeId of plantillasActivasIds) {
    const categoria = CATEGORIAS_PLANTILLA[activeId];
    if (categoria && PLANTILLAS_POR_CATEGORIA[categoria]) {
      for (const tId of PLANTILLAS_POR_CATEGORIA[categoria]) {
        result.add(tId);
      }
    }
  }
  return Array.from(result);
}

