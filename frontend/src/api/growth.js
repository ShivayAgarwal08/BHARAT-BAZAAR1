import api from './client'
export const createGrowthRequest = (data) => api.post('/growth/requests', data)
export const myGrowthRequests = () => api.get('/growth/requests/mine')
export const myPilots = () => api.get('/growth/pilots/mine')
export const adminGrowthRequests = () => api.get('/growth/requests')
export const assignGrowthRequest = (id, studentId) => api.post(`/growth/requests/${id}/assign?student_id=${studentId}`)
export const startPilot = (id) => api.post(`/growth/requests/${id}/start-pilot`)
export const adminPilots = () => api.get('/growth/pilots')
