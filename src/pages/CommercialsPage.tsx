import { useCallback, useEffect, useMemo, useState } from 'react';
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
    UserX,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import { commercialService } from '@/services/commercialService';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/common/Spinner';
import type {
    CommercialDto,
    CreateCommercialRequest,
    UpdateCommercialRequest,
} from '@/types';

/* ── Zod schemas ─────────────────────────────────────────── */

const createSchema = z.object({
    firstName: z.string().min(2, 'Minimum 2 caractères'),
    lastName: z.string().min(2, 'Minimum 2 caractères'),
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Minimum 6 caractères'),
    phone: z.string().min(8, 'Numéro invalide'),
    region: z.string().min(2, 'Requis'),
    city: z.string().min(2, 'Requis'),
    hireDate: z.string().min(1, 'Requis'),
});

const updateSchema = z.object({
    phone: z.string().min(8, 'Numéro invalide'),
    region: z.string().min(2, 'Requis'),
    city: z.string().min(2, 'Requis'),
    isActive: z.boolean(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

/* ── Page component ──────────────────────────────────────── */

function CommercialsPage() {
    const role = useAuthStore((s) => s.role);
    const isAdmin = role === 'Admin';

    /* state */
    const [commercials, setCommercials] = useState<CommercialDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const pageSize = 20;

    /* modal state */
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CommercialDto | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<CommercialDto | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<CommercialDto | null>(null);

    /* fetch */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await commercialService.getAll(page, pageSize);
            setCommercials(result.data);
            setTotalPages(result.totalPages);
            setTotalCount(result.totalCount);
        } catch {
            toast.error('Erreur lors du chargement des commerciaux');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* filtered list */
    const filtered = useMemo(() => {
        if (!search.trim()) return commercials;
        const q = search.toLowerCase();
        return commercials.filter(
            (c) =>
                c.firstName.toLowerCase().includes(q) ||
                c.lastName.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q)
        );
    }, [commercials, search]);

    /* handlers */
    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (c: CommercialDto) => {
        setEditing(c);
        setModalOpen(true);
    };

    const handleDeactivate = async () => {
        if (!confirmDeactivate) return;
        try {
            await commercialService.deactivate(confirmDeactivate.id);
            toast.success('Commercial désactivé');
            setConfirmDeactivate(null);
            fetchData();
        } catch {
            toast.error('Erreur lors de la désactivation');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await commercialService.delete(confirmDelete.id);
            toast.success('Commercial supprimé définitivement');
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
                    <h1 className="text-2xl font-bold text-gray-900">Commerciaux</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {totalCount} commercial{totalCount !== 1 ? 'x' : ''} au total
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-9 w-60"
                        />
                    </div>

                    {isAdmin && (
                        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Ajouter
                        </button>
                    )}
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-500 py-20">Aucun commercial trouvé.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Nom</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Téléphone</th>
                                    <th className="px-6 py-3">Région</th>
                                    <th className="px-6 py-3">Ville</th>
                                    <th className="px-6 py-3">Date d'embauche</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {c.firstName} {c.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{c.email}</td>
                                        <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{c.region}</td>
                                        <td className="px-6 py-4 text-gray-600">{c.city}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(c.hireDate), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                                    c.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                )}
                                            >
                                                {c.isActive ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            {isAdmin && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(c)}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    {c.isActive && (
                                                        <button
                                                            onClick={() => setConfirmDeactivate(c)}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            title="Désactiver"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setConfirmDelete(c)}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
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
                <CommercialModal
                    editing={editing}
                    onClose={() => {
                        setModalOpen(false);
                        setEditing(null);
                    }}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Deactivate confirmation */}
            {confirmDeactivate && (
                <ConfirmDialog
                    message={`Désactiver ${confirmDeactivate.firstName} ${confirmDeactivate.lastName} ?`}
                    onConfirm={handleDeactivate}
                    onCancel={() => setConfirmDeactivate(null)}
                />
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
                <ConfirmDialog
                    message={`Supprimer définitivement ${confirmDelete.firstName} ${confirmDelete.lastName} ? Cette action est irréversible et supprimera toutes les données associées (clients, visites).`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}

/* ── Modal ───────────────────────────────────────────────── */

interface ModalProps {
    editing: CommercialDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function CommercialModal({ editing, onClose, onSuccess }: ModalProps) {
    const isEdit = !!editing;

    /* create form */
    const createForm = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            region: '',
            city: '',
            hireDate: new Date().toISOString().slice(0, 10),
        },
    });

    /* update form */
    const updateForm = useForm<UpdateFormValues>({
        resolver: zodResolver(updateSchema),
        defaultValues: editing
            ? { phone: editing.phone, region: editing.region, city: editing.city, isActive: editing.isActive }
            : undefined,
    });

    const form = isEdit ? updateForm : createForm;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { register, handleSubmit, formState: { errors, isSubmitting } } = form as any;

    const onSubmit = async (values: CreateFormValues | UpdateFormValues) => {
        try {
            if (isEdit && editing) {
                await commercialService.update(editing.id, values as Partial<UpdateCommercialRequest>);
                toast.success('Commercial mis à jour');
            } else {
                await commercialService.create(values as CreateCommercialRequest);
                toast.success('Commercial créé');
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
                        {isEdit ? 'Modifier le commercial' : 'Nouveau commercial'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {!isEdit && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Prénom" error={errors.firstName?.message}>
                                    <input {...register('firstName')} className="input" />
                                </Field>
                                <Field label="Nom" error={errors.lastName?.message}>
                                    <input {...register('lastName')} className="input" />
                                </Field>
                            </div>

                            <Field label="Email" error={errors.email?.message}>
                                <input type="email" {...register('email')} className="input" />
                            </Field>

                            <Field label="Mot de passe" error={errors.password?.message}>
                                <input type="password" {...register('password')} className="input" />
                            </Field>
                        </>
                    )}

                    <Field label="Téléphone" error={errors.phone?.message}>
                        <input {...register('phone')} className="input" />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Région" error={errors.region?.message}>
                            <input {...register('region')} className="input" />
                        </Field>
                        <Field label="Ville" error={errors.city?.message}>
                            <input {...register('city')} className="input" />
                        </Field>
                    </div>

                    {!isEdit && (
                        <Field label="Date d'embauche" error={errors.hireDate?.message}>
                            <input type="date" {...register('hireDate')} className="input" />
                        </Field>
                    )}

                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register('isActive')}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Actif
                        </label>
                    )}

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
                        Désactiver
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

export default CommercialsPage;
