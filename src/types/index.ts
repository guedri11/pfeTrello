export type UserRole = 'Admin' | 'Commercial' | 'Supervisor';
export type VisitStatus = 'Todo' | 'InProgress' | 'Done';
export type ClientStatus = 'Active' | 'Inactive' | 'Prospect';
export type TaskColumn = 'Todo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    email: string;
    fullName: string;
    role: UserRole;
    commercialId?: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
}

export interface CommercialDto {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    region: string;
    city: string;
    hireDate: string;
    isActive: boolean;
}

export interface CommercialPerformanceDto {
    commercialId: number;
    fullName: string;
    totalClients: number;
    activeClients: number;
    totalVisits: number;
    completedVisits: number;
    conversionRate: number;
}

export interface CreateCommercialRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    region: string;
    city: string;
    hireDate: string;
}

export interface UpdateCommercialRequest {
    phone: string;
    region: string;
    city: string;
    isActive: boolean;
}

export interface ClientDto {
    id: number;
    commercialId: number;
    commercialName: string;
    name: string;
    address: string;
    sector: string;
    status: ClientStatus;
    phone: string;
    email: string;
    notes?: string;
    createdAt: string;
}

export interface CreateClientRequest {
    commercialId: number;
    name: string;
    address: string;
    sector: string;
    status: ClientStatus;
    phone: string;
    email: string;
    notes?: string;
}

export interface UpdateClientRequest {
    name: string;
    address: string;
    sector: string;
    status: ClientStatus;
    phone: string;
    email: string;
    notes?: string;
}

export interface VisitDto {
    id: number;
    commercialId: number;
    commercialName: string;
    clientId: number;
    clientName: string;
    plannedDate: string;
    actualDate?: string;
    status: VisitStatus;
    objective: string;
    report?: string;
    result?: string;
    createdAt: string;
}

export interface CreateVisitRequest {
    commercialId: number;
    clientId: number;
    plannedDate: string;
    objective: string;
}

export interface UpdateVisitRequest {
    plannedDate: string;
    objective: string;
}

export interface UpdateVisitReportRequest {
    report: string;
    result?: string;
    actualDate?: string;
}

export interface TaskDto {
    id: number;
    title: string;
    description?: string;
    assignedToId?: number;
    assignedToName?: string;
    column: TaskColumn;
    priority: TaskPriority;
    order: number;
    dueDate?: string;
    createdAt: string;
}

export interface CreateTaskRequest {
    title: string;
    description?: string;
    assignedToId?: number;
    column: TaskColumn;
    priority: TaskPriority;
    dueDate: string;
}

export interface UpdateTaskRequest {
    title: string;
    description?: string;
    assignedToId?: number;
    priority: TaskPriority;
    dueDate?: string;
}

export interface MoveTaskRequest {
    column: TaskColumn;
    order: number;
}

export interface DashboardSummaryDto {
    totalVisits: number;
    completedVisits: number;
    totalClients: number;
    activeClients: number;
    conversionRate: number;
    pendingTasks: number;
    totalCommercials: number;
}

export interface VisitTrendDto {
    month: string;
    count: number;
}

export interface PagedResult<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ApiError {
    statusCode: number;
    message: string;
    errors?: string[];
}
