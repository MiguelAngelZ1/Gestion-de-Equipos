/**
 * Selector puro del gateway que corresponde a cada red.
 * Vive en modulo propio (sin requires) para que sea testeable en Vitest
 * sin arrastrar la cadena db/logger/scheduler.
 *
 * Regresion que custodia: el monitor usaba `redes.find(r => r.gateway)`
 * global — con la red del trabajo creada antes que la de casa, el canary
 * chequeaba un gateway inalcanzable, quedaba insano y congelaba los
 * OFFLINE de TODAS las redes (nodos clavados en WARNING).
 */
export function gatewayForRed(
  redes: Array<{ id: string; gateway?: string | null }>,
  redId: string
): string | null {
  return redes.find((r) => r.id === redId)?.gateway || null;
}
