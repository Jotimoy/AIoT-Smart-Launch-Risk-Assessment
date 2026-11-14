let inMemoryCsrfToken = '';
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string): void {
  inMemoryCsrfToken = token || '';
}

export function getCsrfToken(): string {
  return inMemoryCsrfToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && inMemoryCsrfToken) {
    headers.set('X-CSRF-Token', inMemoryCsrfToken);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (res.status === 401 && unauthorizedHandler && typeof input === 'string' && !input.startsWith('/api/auth/login')) {
    unauthorizedHandler();
  }

  return res;
}
