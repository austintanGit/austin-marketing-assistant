import axios from 'axios'

const api = axios.create({
  baseURL: '/api', // This will proxy to localhost:3001/api in development
  timeout: 120000, // 2 minutes default
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── PEXELS API FUNCTIONS ─────────────────────────────────────────────────────

// Search Pexels photos
export const searchPexelsPhotos = async (query, page = 1, per_page = 20, orientation = 'all') => {
  const response = await api.get(`/social/pexels/search`, {
    params: { q: query, page, per_page, orientation }
  })
  return response.data
}

// Get specific photo details
export const getPexelsPhoto = async (photoId) => {
  const response = await api.get(`/social/pexels/photo/${photoId}`)
  return response.data
}

// Select and download photo to S3
export const selectPexelsPhoto = async (photoId, size = 'large') => {
  const response = await api.post(`/social/pexels/select/${photoId}`, { size })
  return response.data
}

// AI-powered photo selection
export const aiSelectPexelsPhotos = async (prompt, count = 9) => {
  const response = await api.post(`/social/pexels/ai-select`, { prompt, count })
  return response.data
}

export default api