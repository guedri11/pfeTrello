import { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { CalendarCheck, Users, TrendingUp, KanbanSquare, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { dashboardService, reportService } from '@/services/reportService';
import type {
    DashboardSummaryDto,
    CommercialPerformanceDto,
    VisitTrendDto,
} from '@/types';

const CHART_COLOR = '#2563eb';

function DashboardPage() {
    const role = useAuthStore((s) => s.role);
    const isAdmin = role === 'Admin';
    const isAdminOrSupervisor = role === 'Admin' || role === 'Supervisor';

    const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
    const [trend, setTrend] = useState<VisitTrendDto[]>([]);
    const [performance, setPerformance] = useState<CommercialPerformanceDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [summaryData, trendData, perfData] = await Promise.all([
                    dashboardService.getSummary(),
                    dashboardService.getVisitsTrend(6),
                    isAdminOrSupervisor
                        ? dashboardService.getPerformance()
                        : Promise.resolve([]),
                ]);
                setSummary(summaryData);
                setTrend(trendData);
                setPerformance(perfData);
            } catch {
                toast.error('Erreur lors du chargement du tableau de bord');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAdminOrSupervisor]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Chargement…</p>
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Visites',
            value: summary?.totalVisits ?? 0,
            subtitle: `${summary?.completedVisits ?? 0} terminées`,
            icon: CalendarCheck,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Total Clients',
            value: summary?.totalClients ?? 0,
            subtitle: `${summary?.activeClients ?? 0} actifs`,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Taux de Conversion',
            value: `${(summary?.conversionRate ?? 0).toFixed(1)}%`,
            subtitle: 'visites → clients actifs',
            icon: TrendingUp,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Tâches en Attente',
            value: summary?.pendingTasks ?? 0,
            subtitle: 'à traiter',
            icon: KanbanSquare,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="bg-white rounded-lg shadow-sm p-5 flex items-start gap-4"
                    >
                        <div className={`${card.bg} ${card.color} rounded-lg p-3`}>
                            <card.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">
                                {card.value}
                            </p>
                            <p className="text-sm font-medium text-gray-600">
                                {card.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {card.subtitle}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visits Trend */}
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Tendance des Visites
                    </h2>
                    {trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar
                                    dataKey="count"
                                    name="Visites"
                                    fill={CHART_COLOR}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-400 text-sm">Aucune donnée disponible</p>
                    )}
                </div>

                {/* Commercial Performance */}
                {isAdminOrSupervisor && (
                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            Performance Commerciale
                        </h2>
                        {performance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={performance}
                                    layout="vertical"
                                    margin={{ left: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="fullName"
                                        width={120}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    <Bar
                                        dataKey="completedVisits"
                                        name="Visites terminées"
                                        fill={CHART_COLOR}
                                        radius={[0, 4, 4, 0]}
                                    />
                                    <Bar
                                        dataKey="totalVisits"
                                        name="Total visites"
                                        fill="#93c5fd"
                                        radius={[0, 4, 4, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400 text-sm">
                                Aucune donnée disponible
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Export buttons */}
            {isAdmin && (
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Export & Reporting
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={async () => {
                                try { await reportService.downloadVisitsExcel(); toast.success('Export visites téléchargé'); } catch { toast.error('Erreur lors de l\'export'); }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Visites (Excel)
                        </button>
                        <button
                            onClick={async () => {
                                try { await reportService.downloadVisitsPdf(); toast.success('Export PDF téléchargé'); } catch { toast.error('Erreur lors de l\'export'); }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Visites (PDF)
                        </button>
                        <button
                            onClick={async () => {
                                try { await reportService.downloadPerformanceExcel(); toast.success('Export performance téléchargé'); } catch { toast.error('Erreur lors de l\'export'); }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Performance (Excel)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
