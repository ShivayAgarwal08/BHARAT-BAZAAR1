import api from './client'
export const createProduct = (data) => api.post('/product/create', data)
export const listProducts = () => api.get('/product/list')
export const getAllProducts = () => api.get('/product/all')
export const getProduct = (id) => api.get(`/product/${id}`)
export const deleteProduct = (id) => api.delete(`/product/${id}`)
