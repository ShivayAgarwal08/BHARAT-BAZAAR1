import api from './client'
export const requestManager = (data) => api.post('/manager/request', data)
export const listRequests = () => api.get('/manager/requests')
export const myRequests = () => api.get('/manager/my-requests')
export const applyForManager = (data) => api.post('/manager/apply', data)
export const getApplications = (requestId) => api.get(`/manager/applications/${requestId}`)
export const selectIntern = (applicationId) => api.post(`/manager/select/${applicationId}`)

// New Direct Hiring Flow
export const getInterns = () => api.get('/manager/interns')
export const hireIntern = (data) => api.post('/manager/hire', data)
export const getInvitations = () => api.get('/manager/invitations')
export const updateInvitationStatus = (requestId, data) => api.patch(`/manager/invitations/${requestId}`, data)

// Intern Alert Flow
export const sendAlert = (data) => api.post('/manager/alerts', data)
export const getAlerts = () => api.get('/manager/alerts')
