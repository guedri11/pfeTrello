import api from './api';
import type {
    DashboardSummaryDto,
    CommercialPerformanceDto,
    VisitTrendDto,
} from '@/types';

export const dashboardService = {
    getSummary: () =>
        api.get<DashboardSummaryDto>('/dashboard/summary').then((r) => r.data),

    getPerformance: () =>
        api
            .get<CommercialPerformanceDto[]>('/dashboard/performance')
            .then((r) => r.data),

    getVisitsTrend: (months = 6) =>
        api
            .get<VisitTrendDto[]>('/dashboard/visits-trend', { params: { months } })
            .then((r) => r.data),
};

export const reportService = {
    downloadVisitsExcel: async (params?: {
        from?: string;
        to?: string;
        commercialId?: number;
    }) => {
        const resp = await api.get('/report/visits/excel', {
            params,
            responseType: 'blob',
        });
        triggerDownload(resp.data, 'visites.xlsx');
    },

    downloadVisitsPdf: async (params?: {
        from?: string;
        to?: string;
        commercialId?: number;
    }) => {
        const resp = await api.get('/report/visits/pdf', {
            params,
            responseType: 'blob',
        });
        triggerDownload(resp.data, 'visites.pdf');
    },

    downloadPerformanceExcel: async () => {
        const resp = await api.get('/report/performance/excel', {
            responseType: 'blob',
        });
        triggerDownload(resp.data, 'performance.xlsx');
    },
};

function triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
