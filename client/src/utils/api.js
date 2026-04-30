const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function validateCredentials(login, password) {
  return request('/validate-credentials', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export async function fetchLocations(login, password) {
  return request(`/locations?login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`);
}

export async function estimateCost(params) {
  return request('/estimate-cost', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function startAudit(config) {
  return request('/audit/start', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function getAuditStatus(auditId) {
  return request(`/audit/${auditId}/status`);
}

export async function getAuditResults(auditId) {
  return request(`/audit/${auditId}/results`);
}

export async function getModuleResults(auditId, moduleNum) {
  return request(`/audit/${auditId}/module/${moduleNum}`);
}

export function getExportJsonUrl(auditId) {
  return `${API_BASE}/audit/${auditId}/export/json`;
}

export async function exportXlsx(auditId) {
  return request(`/audit/${auditId}/export/xlsx`, { method: 'POST' });
}

export async function exportDocx(auditId) {
  return request(`/audit/${auditId}/export/docx`, { method: 'POST' });
}
