import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import {
    Plus,
    Pencil,
    Trash2,
    Filter,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import { clientService } from '@/services/clientService';
import { commercialService } from '@/services/commercialService';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/common/Spinner';
import type {
    ClientDto,
    ClientStatus,
    CommercialDto,
    CreateClientRequest,
    UpdateClientRequest,
} from '@/types';

/* ── Zod schema ──────────────────────────────────────────── */

const clientSchema = z.object({
    commercialId: z.number().min(1, 'Commercial requis'),
    name: z.string().min(2, 'Minimum 2 caractères'),
    address: z.string().min(2, 'Adresse requise'),
    sector: z.string().min(1, 'Secteur requis'),
    status: z.enum(['Active', 'Inactive', 'Prospect'] as const),
    phone: z.string().min(8, 'Numéro invalide'),
    email: z.string().email('Email invalide'),
    notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
    { value: 'Active', label: 'Actif' },
    { value: 'Inactive', label: 'Inactif' },
    { value: 'Prospect', label: 'Prospect' },
];

const statusBadge: Record<ClientStatus, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-red-100 text-red-800',
    Prospect: 'bg-yellow-100 text-yellow-800',
};

/* ── Page component ──────────────────────────────────────── */

function ClientsPage() {
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.role);
    const authCommercialId = useAuthStore((s) => s.commercialId);
    const isAdmin = role === 'Admin';
    const isAdminOrSupervisor = role === 'Admin' || role === 'Supervisor';

    /* data state */
    const [clients, setClients] = useState<ClientDto[]>([]);
    const [commercials, setCommercials] = useState<CommercialDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    /* filter state */
    const [filterSector, setFilterSector] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCommercialId, setFilterCommercialId] = useState('');

    /* modal state */
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ClientDto | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ClientDto | null>(null);

    /* distinct sectors for filter dropdown */
    const sectors = useMemo(() => {
        const set = new Set(clients.map((c) => c.sector).filter(Boolean));
        return Array.from(set).sort();
    }, [clients]);

    /* fetch commercials once */
    useEffect(() => {
        commercialService.getAll(1, 200).then((r) => setCommercials(r.data)).catch(() => { });
    }, []);

    /* fetch clients */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, pageSize };
            if (filterSector) params.sector = filterSector;
            if (filterStatus) params.status = filterStatus;
            if (isAdminOrSupervisor && filterCommercialId) {
                params.commercialId = Number(filterCommercialId);
            } else if (!isAdminOrSupervisor && authCommercialId) {
                params.commercialId = authCommercialId;
            }
            const result = await clientService.getAll(params as Parameters<typeof clientService.getAll>[0]);
            setClients(result.data);
            setTotalPages(result.totalPages);
            setTotalCount(result.totalCount);
        } catch {
            toast.error('Erreur lors du chargement des clients');
        } finally {
            setLoading(false);
        }
    }, [page, filterSector, filterStatus, filterCommercialId, isAdminOrSupervisor, authCommercialId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* reset page on filter change */
    useEffect(() => {
        setPage(1);
    }, [filterSector, filterStatus, filterCommercialId]);

    /* handlers */
    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (c: ClientDto) => {
        setEditing(c);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await clientService.delete(confirmDelete.id);
            toast.success('Client supprimé');
            setConfirmDelete(null);
            fetchData();
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleModalSuccess = () => {
        setModalOpen(false);
        setEditing(null);
        fetchData();
    };

    /* ── render ───────────────────────────────────────────── */
    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {totalCount} client{totalCount !== 1 ? 's' : ''} au total
                    </p>
                </div>

                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter
                </button>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-gray-400" />

                <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="input w-48"
                >
                    <option value="">Tous les secteurs</option>
                    {sectors.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="input w-40"
                >
                    <option value="">Tous les statuts</option>
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {isAdminOrSupervisor && (
                    <select
                        value={filterCommercialId}
                        onChange={(e) => setFilterCommercialId(e.target.value)}
                        className="input w-52"
                    >
                        <option value="">Tous les commerciaux</option>
                        {commercials.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.firstName} {c.lastName}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner />
                    </div>
                ) : clients.length === 0 ? (
                    <p className="text-center text-gray-500 py-20">Aucun client trouvé.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Nom</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Téléphone</th>
                                    <th className="px-6 py-3">Secteur</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3">Commercial</th>
                                    <th className="px-6 py-3">Créé le</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {clients.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            <button
                                                onClick={() => navigate(`/clients/${c.id}`)}
                                                className="text-primary-600 hover:text-primary-800 hover:underline"
                                            >
                                                {c.name}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{c.email}</td>
                                        <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{c.sector}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                                    statusBadge[c.status]
                                                )}
                                            >
                                                {STATUS_OPTIONS.find((o) => o.value === c.status)?.label ?? c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{c.commercialName}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(c.createdAt), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(c)}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => setConfirmDelete(c)}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 text-sm">
                        <span className="text-gray-600">
                            Page {page} sur {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Précédent
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3 disabled:opacity-40"
                            >
                                Suivant
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit modal */}
            {modalOpen && (
                <ClientModal
                    editing={editing}
                    commercials={commercials}
                    defaultCommercialId={authCommercialId}
                    onClose={() => {
                        setModalOpen(false);
                        setEditing(null);
                    }}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
                <ConfirmDialog
                    message={`Supprimer le client « ${confirmDelete.name} » ? Cette action est irréversible.`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}

/* ── Modal ───────────────────────────────────────────────── */

interface ModalProps {
    editing: ClientDto | null;
    commercials: CommercialDto[];
    defaultCommercialId: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

function ClientModal({ editing, commercials, defaultCommercialId, onClose, onSuccess }: ModalProps) {
    const isEdit = !!editing;

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: editing
            ? {
                commercialId: editing.commercialId,
                name: editing.name,
                address: editing.address,
                sector: editing.sector,
                status: editing.status,
                phone: editing.phone,
                email: editing.email,
                notes: editing.notes ?? '',
            }
            : {
                commercialId: defaultCommercialId ?? 0,
                name: '',
                address: '',
                sector: '',
                status: 'Prospect' as const,
                phone: '',
                email: '',
                notes: '',
            },
    });

    const onSubmit = async (values: ClientFormValues) => {
        try {
            if (isEdit && editing) {
                const { commercialId: _, ...updateData } = values;
                await clientService.update(editing.id, updateData as Partial<UpdateClientRequest>);
                toast.success('Client mis à jour');
            } else {
                await clientService.create(values as CreateClientRequest);
                toast.success('Client créé');
            }
            onSuccess();
        } catch {
            toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? 'Modifier le client' : 'Nouveau client'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <Field label="Commercial" error={errors.commercialId?.message}>
                        <select {...register('commercialId', { valueAsNumber: true })} className="input" disabled={isEdit}>
                            <option value={0}>— Sélectionner —</option>
                            {commercials.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Nom" error={errors.name?.message}>
                        <input {...register('name')} className="input" />
                    </Field>

                    <Field label="Adresse" error={errors.address?.message}>
                        <input {...register('address')} className="input" />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Secteur" error={errors.sector?.message}>
                            <input {...register('sector')} className="input" />
                        </Field>
                        <Field label="Statut" error={errors.status?.message}>
                            <select {...register('status')} className="input">
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Téléphone" error={errors.phone?.message}>
                            <input {...register('phone')} className="input" />
                        </Field>
                        <Field label="Email" error={errors.email?.message}>
                            <input type="email" {...register('email')} className="input" />
                        </Field>
                    </div>

                    <Field label="Notes" error={errors.notes?.message}>
                        <textarea {...register('notes')} rows={3} className="input" />
                    </Field>

                    {/* actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting
                                ? 'Enregistrement…'
                                : isEdit
                                    ? 'Mettre à jour'
                                    : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Confirm dialog ──────────────────────────────────────── */

interface ConfirmProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
                <p className="text-gray-800 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="btn-secondary">
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Field helper ────────────────────────────────────────── */

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

export default ClientsPage;
