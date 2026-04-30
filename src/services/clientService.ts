import api from './api';
import type {
    ClientDto,
    CreateClientRequest,
    PagedResult,
    UpdateClientRequest,
    VisitDto,
} from '@/types';

export const clientService = {
    getAll: (params?: {
        commercialId?: number;
        sector?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }) =>
        api
            .get<PagedResult<ClientDto>>('/client', {
                params: { page: 1, pageSize: 20, ...params },
            })
            .then((r) => r.data),

    getById: (id: number) =>
        api.get<ClientDto>(`/client/${id}`).then((r) => r.data),

    create: (data: CreateClientRequest) =>
        api.post<ClientDto>('/client', data).then((r) => r.data),

    update: (id: number, data: Partial<UpdateClientRequest>) =>
        api.put<ClientDto>(`/client/${id}`, data).then((r) => r.data),

    delete: (id: number) => api.delete(`/client/${id}`).then((r) => r.data),

    getVisits: (id: number) =>
        api.get<VisitDto[]>(`/client/${id}/visits`).then((r) => r.data),
};
