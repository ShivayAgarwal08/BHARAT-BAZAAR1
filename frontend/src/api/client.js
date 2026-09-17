import axios from 'axios'

const api = axios.create({
  // In development this uses Vite's /api proxy when no explicit endpoint is set.
  // Production deployments should set VITE_API_URL to the public API origin.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vl_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vl_token')
      localStorage.removeItem('vl_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
