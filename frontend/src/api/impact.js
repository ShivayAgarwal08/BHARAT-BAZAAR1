import api from './client'
export const getImpactStats = () => api.get('/impact/stats')
