import api from './api';
import type {
    CommercialDto,
    CommercialPerformanceDto,
    CreateCommercialRequest,
    PagedResult,
    UpdateCommercialRequest,
} from '@/types';

export const commercialService = {
    getAll: (page = 1, pageSize = 20) =>
        api
            .get<PagedResult<CommercialDto>>('/commercial', {
                params: { page, pageSize },
            })
            .then((r) => r.data),

    getById: (id: number) =>
        api.get<CommercialDto>(`/commercial/${id}`).then((r) => r.data),

    create: (data: CreateCommercialRequest) =>
        api.post<CommercialDto>('/commercial', data).then((r) => r.data),

    update: (id: number, data: Partial<UpdateCommercialRequest>) =>
        api.put<CommercialDto>(`/commercial/${id}`, data).then((r) => r.data),

    deactivate: (id: number) =>
        api.patch(`/commercial/${id}/deactivate`).then((r) => r.data),

    delete: (id: number) =>
        api.delete(`/commercial/${id}`).then((r) => r.data),

    getPerformance: (id: number) =>
        api
            .get<CommercialPerformanceDto>(`/commercial/${id}/performance`)
            .then((r) => r.data),
};
