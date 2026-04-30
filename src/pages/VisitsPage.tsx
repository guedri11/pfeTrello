import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import {
    Plus,
    List,
    LayoutGrid,
    FileText,
    ChevronLeft,
    ChevronRight,
    X,
    GripVertical,
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

import { visitService } from '@/services/visitService';
import { commercialService } from '@/services/commercialService';
import { clientService } from '@/services/clientService';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/common/Spinner';
import type {
    ClientDto,
    CommercialDto,
    CreateVisitRequest,
    UpdateVisitReportRequest,
    VisitDto,
    VisitStatus,
} from '@/types';

/* ── Constants ───────────────────────────────────────────── */

const STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
    { value: 'Todo', label: 'À faire' },
    { value: 'InProgress', label: 'En cours' },
    { value: 'Done', label: 'Terminé' },
];

const statusBadge: Record<VisitStatus, string> = {
    Todo: 'bg-blue-100 text-blue-800',
    InProgress: 'bg-yellow-100 text-yellow-800',
    Done: 'bg-green-100 text-green-800',
};

const statusLabel: Record<VisitStatus, string> = {
    Todo: 'À faire',
    InProgress: 'En cours',
    Done: 'Terminé',
};

/* ── Zod schemas ─────────────────────────────────────────── */

const createVisitSchema = z.object({
    commercialId: z.number().min(1, 'Commercial requis'),
    clientId: z.number().min(1, 'Client requis'),
    plannedDate: z.string().min(1, 'Date prévue requise'),
    objective: z.string().min(2, 'Objectif requis (min 2 caractères)'),
});
type CreateVisitFormValues = z.infer<typeof createVisitSchema>;

const reportSchema = z.object({
    report: z.string().min(2, 'Rapport requis (min 2 caractères)'),
    result: z.string().optional(),
    actualDate: z.string().optional(),
});
type ReportFormValues = z.infer<typeof reportSchema>;

/* ── Kanban sub-components ───────────────────────────────── */

function DroppableColumn({
    id,
    label,
    children,
}: {
    id: string;
    label: string;
    children: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={clsx(
                'flex-1 min-w-[280px] bg-gray-100 rounded-lg p-3 transition-colors',
                isOver && 'ring-2 ring-primary-400 bg-primary-50'
            )}
        >
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                {label}
            </h3>
            <div className="space-y-2 min-h-[60px]">{children}</div>
        </div>
    );
}

function SortableVisitCard({
    visit,
    onReport,
}: {
    visit: VisitDto;
    onReport: (v: VisitDto) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: visit.id.toString() });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white rounded-md shadow-sm border border-gray-200 p-3"
        >
            <div className="flex items-start gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    aria-label="Drag"
                >
                    <GripVertical size={14} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {visit.clientName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {visit.objective}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(visit.plannedDate), 'dd MMM yyyy', { locale: fr })}
                    </p>
                </div>
                <button
                    onClick={() => onReport(visit)}
                    className="text-gray-400 hover:text-primary-600"
                    title="Rapport"
                >
                    <FileText size={14} />
                </button>
            </div>
        </div>
    );
}

function VisitCardOverlay({ visit }: { visit: VisitDto }) {
    return (
        <div className="bg-white rounded-md shadow-lg border border-primary-300 p-3 w-[260px]">
            <p className="text-sm font-medium text-gray-900 truncate">
                {visit.clientName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
                {visit.objective}
            </p>
            <p className="text-xs text-gray-400 mt-1">
                {format(new Date(visit.plannedDate), 'dd MMM yyyy', { locale: fr })}
            </p>
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────── */

function VisitsPage() {
    const role = useAuthStore((s) => s.role);
    const authCommercialId = useAuthStore((s) => s.commercialId);
    const isAdminOrSupervisor = role === 'Admin' || role === 'Supervisor';

    /* ── data ── */
    const [visits, setVisits] = useState<VisitDto[]>([]);
    const [commercials, setCommercials] = useState<CommercialDto[]>([]);
    const [clients, setClients] = useState<ClientDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    /* ── view toggle ── */
    const [view, setView] = useState<'list' | 'kanban'>('list');

    /* ── filters ── */
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    /* ── modals ── */
    const [createOpen, setCreateOpen] = useState(false);
    const [reportVisit, setReportVisit] = useState<VisitDto | null>(null);

    /* ── drag state ── */
    const [activeVisit, setActiveVisit] = useState<VisitDto | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    /* ── fetch reference data ── */
    useEffect(() => {
        Promise.all([
            commercialService.getAll(1, 200),
            clientService.getAll({ page: 1, pageSize: 200 }),
        ])
            .then(([c, cl]) => {
                setCommercials(c.data);
                setClients(cl.data);
            })
            .catch(() => { });
    }, []);

    /* ── fetch visits ── */
    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {
                page: view === 'kanban' ? 1 : page,
                pageSize: view === 'kanban' ? 500 : pageSize,
            };
            if (filterStatus) params.status = filterStatus;
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;
            if (!isAdminOrSupervisor && authCommercialId) {
                params.commercialId = authCommercialId;
            }
            const result = await visitService.getAll(
                params as Parameters<typeof visitService.getAll>[0]
            );
            setVisits(result.data);
            setTotalPages(result.totalPages);
        } catch {
            toast.error('Erreur lors du chargement des visites');
        } finally {
            setLoading(false);
        }
    }, [page, view, filterStatus, filterFrom, filterTo, isAdminOrSupervisor, authCommercialId]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    /* ── Kanban helpers ── */
    const columnVisits = (status: VisitStatus) =>
        visits.filter((v) => v.status === status);

    const handleDragStart = (event: DragStartEvent) => {
        const id = Number(event.active.id);
        setActiveVisit(visits.find((v) => v.id === id) ?? null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveVisit(null);
        const { active, over } = event;
        if (!over) return;

        const visitId = Number(active.id);
        const visit = visits.find((v) => v.id === visitId);
        if (!visit) return;

        // Determine target column
        let targetStatus: VisitStatus | null = null;
        const overIdStr = over.id.toString();

        // Check if dropped on a column directly
        if (['Todo', 'InProgress', 'Done'].includes(overIdStr)) {
            targetStatus = overIdStr as VisitStatus;
        } else {
            // Dropped on another card — find that card's column
            const overVisit = visits.find((v) => v.id === Number(over.id));
            if (overVisit) targetStatus = overVisit.status;
        }

        if (!targetStatus || targetStatus === visit.status) return;

        // Optimistic update
        setVisits((prev) =>
            prev.map((v) => (v.id === visitId ? { ...v, status: targetStatus } : v))
        );

        try {
            await visitService.updateStatus(visitId, targetStatus);
            toast.success('Statut mis à jour');
        } catch {
            toast.error('Échec de la mise à jour');
            fetchVisits();
        }
    };

    /* ── Create visit form ── */
    const {
        register: regCreate,
        handleSubmit: submitCreate,
        reset: resetCreate,
        formState: { errors: errCreate, isSubmitting: submittingCreate },
    } = useForm<CreateVisitFormValues>({
        resolver: zodResolver(createVisitSchema),
        defaultValues: {
            commercialId: isAdminOrSupervisor ? undefined : (authCommercialId ?? undefined),
        },
    });

    const onCreateSubmit = async (data: CreateVisitFormValues) => {
        try {
            await visitService.create(data as CreateVisitRequest);
            toast.success('Visite créée');
            setCreateOpen(false);
            resetCreate();
            fetchVisits();
        } catch {
            toast.error('Erreur lors de la création');
        }
    };

    /* ── Report form ── */
    const {
        register: regReport,
        handleSubmit: submitReport,
        reset: resetReport,
        formState: { errors: errReport, isSubmitting: submittingReport },
    } = useForm<ReportFormValues>({
        resolver: zodResolver(reportSchema),
    });

    const openReport = (v: VisitDto) => {
        resetReport({
            report: v.report ?? '',
            result: v.result ?? '',
            actualDate: v.actualDate ? v.actualDate.slice(0, 10) : '',
        });
        setReportVisit(v);
    };

    const onReportSubmit = async (data: ReportFormValues) => {
        if (!reportVisit) return;
        try {
            await visitService.addReport(reportVisit.id, data as UpdateVisitReportRequest);
            toast.success('Rapport enregistré');
            setReportVisit(null);
            fetchVisits();
        } catch {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    /* ── Render ───────────────────────────────────────────── */
    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Visites</h1>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="inline-flex rounded-md shadow-sm">
                        <button
                            onClick={() => setView('list')}
                            className={clsx(
                                'px-3 py-2 text-sm font-medium rounded-l-md border',
                                view === 'list'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <List size={16} className="inline mr-1" />
                            Liste
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={clsx(
                                'px-3 py-2 text-sm font-medium rounded-r-md border-t border-b border-r',
                                view === 'kanban'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <LayoutGrid size={16} className="inline mr-1" />
                            Kanban
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            resetCreate({
                                commercialId: isAdminOrSupervisor ? undefined : (authCommercialId ?? undefined),
                                clientId: undefined,
                                plannedDate: '',
                                objective: '',
                            });
                            setCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                    >
                        <Plus size={16} /> Nouvelle visite
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Statut</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    >
                        <option value="">Tous</option>
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Du</label>
                    <input
                        type="date"
                        value={filterFrom}
                        onChange={(e) => {
                            setFilterFrom(e.target.value);
                            setPage(1);
                        }}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Au</label>
                    <input
                        type="date"
                        value={filterTo}
                        onChange={(e) => {
                            setFilterTo(e.target.value);
                            setPage(1);
                        }}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner />
                </div>
            ) : view === 'list' ? (
                /* ── LIST VIEW ─────────────────────────────── */
                <>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Client
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Commercial
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Date prévue
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Date réelle
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Statut
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Objectif
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visits.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-8 text-center text-gray-400"
                                        >
                                            Aucune visite trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    visits.map((v) => (
                                        <tr key={v.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {v.clientName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {v.commercialName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {format(new Date(v.plannedDate), 'dd/MM/yyyy', {
                                                    locale: fr,
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {v.actualDate
                                                    ? format(new Date(v.actualDate), 'dd/MM/yyyy', {
                                                        locale: fr,
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span
                                                    className={clsx(
                                                        'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                                                        statusBadge[v.status]
                                                    )}
                                                >
                                                    {statusLabel[v.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                                                {v.objective}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => openReport(v)}
                                                    className="text-gray-400 hover:text-primary-600"
                                                    title="Ajouter un rapport"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-gray-500">
                                Page {page} / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-40"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* ── KANBAN VIEW ───────────────────────────── */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {STATUS_OPTIONS.map((col) => (
                            <DroppableColumn
                                key={col.value}
                                id={col.value}
                                label={col.label}
                            >
                                <SortableContext
                                    items={columnVisits(col.value).map((v) =>
                                        v.id.toString()
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {columnVisits(col.value).map((v) => (
                                        <SortableVisitCard
                                            key={v.id}
                                            visit={v}
                                            onReport={openReport}
                                        />
                                    ))}
                                </SortableContext>
                            </DroppableColumn>
                        ))}
                    </div>
                    <DragOverlay>
                        {activeVisit ? (
                            <VisitCardOverlay visit={activeVisit} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* ── Create Visit Modal ──────────────────────── */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Nouvelle visite
                            </h2>
                            <button
                                onClick={() => setCreateOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form
                            onSubmit={submitCreate(onCreateSubmit)}
                            className="space-y-4"
                        >
                            {/* Commercial */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commercial
                                </label>
                                <select
                                    {...regCreate('commercialId', { valueAsNumber: true })}
                                    disabled={!isAdminOrSupervisor}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Sélectionner…</option>
                                    {commercials.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.firstName} {c.lastName}
                                        </option>
                                    ))}
                                </select>
                                {errCreate.commercialId && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errCreate.commercialId.message}
                                    </p>
                                )}
                            </div>
                            {/* Client */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Client
                                </label>
                                <select
                                    {...regCreate('clientId', { valueAsNumber: true })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="">Sélectionner…</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {errCreate.clientId && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errCreate.clientId.message}
                                    </p>
                                )}
                            </div>
                            {/* Planned date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date prévue
                                </label>
                                <input
                                    type="date"
                                    {...regCreate('plannedDate')}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                />
                                {errCreate.plannedDate && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errCreate.plannedDate.message}
                                    </p>
                                )}
                            </div>
                            {/* Objective */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Objectif
                                </label>
                                <input
                                    type="text"
                                    {...regCreate('objective')}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Objectif de la visite"
                                />
                                {errCreate.objective && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errCreate.objective.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCreate}
                                    className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {submittingCreate ? 'Création…' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Report Modal ────────────────────────────── */}
            {reportVisit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Rapport — {reportVisit.clientName}
                            </h2>
                            <button
                                onClick={() => setReportVisit(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form
                            onSubmit={submitReport(onReportSubmit)}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rapport
                                </label>
                                <textarea
                                    {...regReport('report')}
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Détails de la visite…"
                                />
                                {errReport.report && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errReport.report.message}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Résultat
                                </label>
                                <input
                                    type="text"
                                    {...regReport('result')}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Résultat (optionnel)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date réelle
                                </label>
                                <input
                                    type="date"
                                    {...regReport('actualDate')}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReportVisit(null)}
                                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReport}
                                    className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {submittingReport ? 'Enregistrement…' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VisitsPage;
