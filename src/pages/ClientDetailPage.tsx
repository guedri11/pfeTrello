import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { clientService } from '../services/clientService';
import type { ClientDto, VisitDto } from '../types';

const statusBadge: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Prospect: 'bg-blue-100 text-blue-800',
};

const visitStatusBadge: Record<string, string> = {
    Todo: 'bg-yellow-100 text-yellow-800',
    InProgress: 'bg-blue-100 text-blue-800',
    Done: 'bg-green-100 text-green-800',
};

const visitStatusLabel: Record<string, string> = {
    Todo: 'À faire',
    InProgress: 'En cours',
    Done: 'Terminée',
};

function fmt(dateStr: string | undefined) {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
}

function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<ClientDto | null>(null);
    const [visits, setVisits] = useState<VisitDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const numId = Number(id);
        setLoading(true);
        Promise.all([clientService.getById(numId), clientService.getVisits(numId)])
            .then(([c, v]) => {
                setClient(c);
                setVisits(v);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-12 text-gray-500">
                Client introuvable.
                <Link to="/clients" className="ml-2 text-indigo-600 hover:underline">Retour</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back button */}
            <button
                onClick={() => navigate('/clients')}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour aux clients
            </button>

            {/* Client info card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', statusBadge[client.status])}>
                        {client.status}
                    </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{client.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{client.sector}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{client.commercialName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Créé le {fmt(client.createdAt)}</span>
                    </div>
                </div>

                {client.notes && (
                    <p className="mt-4 text-sm text-gray-500">{client.notes}</p>
                )}
            </div>

            {/* Visit history */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">Historique des visites</h2>
                </div>

                {visits.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-500">Aucune visite enregistrée.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Date prévue</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Date réelle</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Statut</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Objectif</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Rapport</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visits.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-3">{fmt(v.plannedDate)}</td>
                                        <td className="whitespace-nowrap px-6 py-3">{fmt(v.actualDate)}</td>
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', visitStatusBadge[v.status])}>
                                                {visitStatusLabel[v.status] ?? v.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 max-w-xs truncate">{v.objective}</td>
                                        <td className="px-6 py-3 max-w-xs truncate text-gray-500">
                                            {v.report ? v.report.slice(0, 80) + (v.report.length > 80 ? '…' : '') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClientDetailPage;
