import api from './api';
import type {
    CreateTaskRequest,
    MoveTaskRequest,
    TaskDto,
    TaskColumn,
    UpdateTaskRequest,
} from '@/types';

export const taskService = {
    getAll: (params?: { assignedToId?: number; column?: TaskColumn }) =>
        api.get<TaskDto[]>('/task', { params }).then((r) => r.data),

    getById: (id: number) =>
        api.get<TaskDto>(`/task/${id}`).then((r) => r.data),

    create: (data: CreateTaskRequest) =>
        api.post<TaskDto>('/task', data).then((r) => r.data),

    update: (id: number, data: Partial<UpdateTaskRequest>) =>
        api.put<TaskDto>(`/task/${id}`, data).then((r) => r.data),

    delete: (id: number) => api.delete(`/task/${id}`).then((r) => r.data),

    move: (id: number, data: MoveTaskRequest) =>
        api.patch<TaskDto>(`/task/${id}/move`, data).then((r) => r.data),
};
