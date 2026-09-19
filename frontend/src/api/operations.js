import api from './client'

export const operations = {
  profile: () => api.get('/operations/profile').then(r => r.data),
  updateProfile: (body) => api.put('/operations/profile', body).then(r => r.data),
  pilotTasks: (id) => api.get(`/operations/pilots/${id}/tasks`).then(r => r.data),
  createPilotTask: (id, body) => api.post(`/operations/pilots/${id}/tasks`, body).then(r => r.data),
  updatePilotTask: (id, body) => api.patch(`/operations/pilot-tasks/${id}`, body).then(r => r.data),
  discovery: (id) => api.get(`/operations/pilots/${id}/discovery`).then(r => r.data),
  submitDiscovery: (id, body) => api.post(`/operations/pilots/${id}/discovery`, body).then(r => r.data),
  metrics: (id) => api.get(`/operations/pilots/${id}/metrics`).then(r => r.data),
  addMetric: (id, body) => api.post(`/operations/pilots/${id}/metrics`, body).then(r => r.data),
  requestCompletion: (id) => api.post(`/operations/pilots/${id}/completion-request`).then(r => r.data),
  decideCompletion: (id, approve) => api.post(`/operations/pilots/${id}/completion-decision`, { approve }).then(r => r.data),
  portfolio: () => api.get('/operations/portfolio').then(r => r.data),
  paid: () => api.get('/operations/paid-engagements/mine').then(r => r.data),
  payments: () => api.get('/operations/payments/mine').then(r => r.data),
  issues: () => api.get('/operations/issues').then(r => r.data),
  adminPaid: () => api.get('/operations/paid-engagements').then(r => r.data),
  adminPayments: () => api.get('/operations/payments').then(r => r.data),
  adminIssues: () => api.get('/operations/issues').then(r => r.data),
  verifyPayment: (id) => api.post(`/operations/payments/${id}/verify`).then(r => r.data),
}
