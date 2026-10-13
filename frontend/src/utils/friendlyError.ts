export function friendlyErrorMessage(
  err: any,
  fallback = 'No se pudo completar la operación. Intenta de nuevo.',
): string {
  const status = err?.status;
  const rawMessage = typeof err?.message === 'string' ? err.message : '';

  if (status === 429 || /demasiad/i.test(rawMessage)) {
    return 'Demasiadas operaciones seguidas. Espera un momento e intenta de nuevo.';
  }

  if (
    (typeof status === 'number' && status >= 500) ||
    /inesperado en el servidor|Error interno del servidor|^Error 5\d\d/.test(rawMessage)
  ) {
    return 'Ocurrió un problema en el servidor. Intenta de nuevo en unos minutos.';
  }

  if (/Failed to fetch|NetworkError|Load failed|Network request failed/.test(rawMessage)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }

  return rawMessage || fallback;
}
