import api from './api';
import type {
    CreateVisitRequest,
    PagedResult,
    UpdateVisitReportRequest,
    UpdateVisitRequest,
    VisitDto,
    VisitStatus,
} from '@/types';

export const visitService = {
    getAll: (params?: {
        commercialId?: number;
        clientId?: number;
        status?: VisitStatus;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
    }) =>
        api
            .get<PagedResult<VisitDto>>('/visit', {
                params: { page: 1, pageSize: 20, ...params },
            })
            .then((r) => r.data),

    getById: (id: number) =>
        api.get<VisitDto>(`/visit/${id}`).then((r) => r.data),

    create: (data: CreateVisitRequest) =>
        api.post<VisitDto>('/visit', data).then((r) => r.data),

    update: (id: number, data: Partial<UpdateVisitRequest>) =>
        api.put<VisitDto>(`/visit/${id}`, data).then((r) => r.data),

    delete: (id: number) => api.delete(`/visit/${id}`).then((r) => r.data),

    updateStatus: (id: number, status: VisitStatus) =>
        api
            .patch<VisitDto>(`/visit/${id}/status`, { status })
            .then((r) => r.data),

    addReport: (id: number, data: UpdateVisitReportRequest) =>
        api
            .patch<VisitDto>(`/visit/${id}/report`, data)
            .then((r) => r.data),
};
