import api from './api';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types';

export const authService = {
    login: (data: LoginRequest) =>
        api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

    register: (data: RegisterRequest) =>
        api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

    logout: () => api.post('/auth/logout').then((r) => r.data),

    refresh: (refreshToken: string) =>
        api
            .post<AuthResponse>('/auth/refresh', { refreshToken })
            .then((r) => r.data),
};
