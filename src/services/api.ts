import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
    baseURL: 'http://localhost:5159/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
                try {
                    const { data } = await axios.post('/api/auth/refresh', {
                        refreshToken,
                    });
                    useAuthStore.getState().setAuth(data);
                    original.headers.Authorization = `Bearer ${data.accessToken}`;
                    return api(original);
                } catch {
                    useAuthStore.getState().logout();
                }
            } else {
                useAuthStore.getState().logout();
            }
        }
        return Promise.reject(error);
    }
);

export default api;
