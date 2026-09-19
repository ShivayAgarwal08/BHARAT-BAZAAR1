import api from './client'

export const getAdminSummary = () => api.get('/admin/summary')
export const listAdminArtisans = () => api.get('/admin/artisans')
export const listAdminInterns = () => api.get('/admin/interns')
export const listAssistedRegistrations = () => api.get('/assisted-registration/requests')
export const updateAssistedRegistration = (id, data) => api.patch(`/assisted-registration/requests/${id}`, data)
export const createAssistedArtisan = (id, data) => api.post(`/admin/assisted-registrations/${id}/create-artisan`, data)
