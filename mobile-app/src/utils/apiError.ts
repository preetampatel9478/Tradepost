import axios from 'axios';

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong';
  }

  // No response means network / CORS / server down
  if (!error.response) {
    const baseURL = (error.config as any)?.baseURL;
    const path = (error.config as any)?.url;
    const method = (error.config as any)?.method;

    const parts: string[] = ['Cannot reach server. Check API URL / network and try again.'];
    if (baseURL || path) {
      const full = `${String(baseURL || '').replace(/\/+$/, '')}${String(path || '')}`;
      parts.push(`Request: ${(method || 'GET').toUpperCase()} ${full}`);
    }
    return parts.join('\n');
  }

  const data: any = error.response.data;

  // Backend errorHandler format
  if (data?.message && typeof data.message === 'string') return data.message;

  // Legacy format
  if (data?.error && typeof data.error === 'string') return data.error;

  // Common patterns
  if (typeof data === 'string' && data.trim()) return data;

  // Validation arrays (if any)
  if (Array.isArray(data?.errors)) {
    const msgs = data.errors
      .map((e: any) => e?.msg || e?.message || e?.error)
      .filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }

  return error.message || 'Request failed';
}
