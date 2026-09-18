import api from './client'

export const requestAssistedRegistration = (data) =>
  api.post('/assisted-registration/request', data)
