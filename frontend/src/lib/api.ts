const MOCK_DATA: Record<string, any> = {
  '/equipment': [],
  '/dashboard/stats': { total_equipment: 0, due_this_week: 0, overdue: 0, issues_found: 0 },
  '/alerts': [],
  '/alerts/count': { count: 0 },
  '/frequencies': [],
  '/pm/schedule': [],
  '/pm/summary': [],
};

function matchMock(path: string): any {
  const exact = MOCK_DATA[path];
  if (exact !== undefined) return exact;
  for (const key of Object.keys(MOCK_DATA)) {
    if (path.startsWith(key) && path.length > key.length) return MOCK_DATA[key];
  }
  return null;
}

async function request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
  const mock = matchMock(path);
  const data = mock !== null ? mock : method === 'GET' ? [] : { success: true };
  return Promise.resolve(data as T);
}

const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};

export default api;
