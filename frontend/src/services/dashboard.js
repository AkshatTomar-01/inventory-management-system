import api from '@/lib/api'

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then(r => r.data),
  getOrderChart: () => api.get('/dashboard/charts/orders').then(r => r.data),
  getInventoryChart: () => api.get('/dashboard/charts/inventory').then(r => r.data),
}
