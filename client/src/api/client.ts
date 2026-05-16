import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const { logout } = useAuth();
      logout?.();
    }
    return Promise.reject(err);
  },
);

export default apiClient;
