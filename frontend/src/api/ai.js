import api from './client'
export const analyzeProduct = (data) => api.post('/ai/analyze-product', data)
export const generateListing = (data) => api.post('/ai/generate-listing', data)
export const marketEstimation = (data) => api.post('/ai/market-estimation', data)
