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
    Pencil,
    Trash2,
    GripVertical,
    Calendar,
    User,
    X,
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';
import { taskService } from '@/services/taskService';
import { commercialService } from '@/services/commercialService';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/common/Spinner';
import type {
    TaskDto,
    TaskColumn,
    TaskPriority,
    CommercialDto,
    CreateTaskRequest,
    UpdateTaskRequest,
} from '@/types';

/* ── Constants ───────────────────────────────────────────── */

const COLUMNS: { key: TaskColumn; label: string; color: string }[] = [
    { key: 'Todo', label: 'À faire', color: 'bg-blue-500' },
    { key: 'InProgress', label: 'En cours', color: 'bg-yellow-500' },
    { key: 'Done', label: 'Terminé', color: 'bg-green-500' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string }> = {
    Low: { label: 'Basse', classes: 'bg-green-100 text-green-800' },
    Medium: { label: 'Moyenne', classes: 'bg-yellow-100 text-yellow-800' },
    High: { label: 'Haute', classes: 'bg-orange-100 text-orange-800' },
    Critical: { label: 'Critique', classes: 'bg-red-100 text-red-800' },
};

/* ── Zod schemas ─────────────────────────────────────────── */

const createSchema = z.object({
    title: z.string().min(2, 'Minimum 2 caractères'),
    description: z.string().optional(),
    assignedToId: z.number().optional(),
    column: z.enum(['Todo', 'InProgress', 'Done'] as const),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical'] as const),
    dueDate: z.string().min(1, 'La date d\'échéance est obligatoire'),
});

const updateSchema = z.object({
    title: z.string().min(2, 'Minimum 2 caractères'),
    description: z.string().optional(),
    assignedToId: z.number().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical'] as const),
    dueDate: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

/* ── Page component ──────────────────────────────────────── */

function TasksPage() {
    const role = useAuthStore((s) => s.role);
    const isAdmin = role === 'Admin';

    const [tasks, setTasks] = useState<TaskDto[]>([]);
    const [commercials, setCommercials] = useState<CommercialDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TaskDto | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<TaskDto | null>(null);
    const [activeTask, setActiveTask] = useState<TaskDto | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [taskData, commercialData] = await Promise.all([
                taskService.getAll(),
                commercialService.getAll(1, 100),
            ]);
            setTasks(taskData);
            setCommercials(commercialData.data);
        } catch {
            toast.error('Erreur lors du chargement des tâches');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* Group tasks by column, sorted by order */
    const tasksByColumn = (col: TaskColumn) =>
        tasks.filter((t) => t.column === col).sort((a, b) => a.order - b.order);

    /* Drag handlers */
    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find((t) => t.id === Number(event.active.id));
        setActiveTask(task ?? null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const taskId = Number(active.id);
        const targetColumn = String(over.id) as TaskColumn;

        if (!COLUMNS.some((c) => c.key === targetColumn)) return;

        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const targetTasks = tasksByColumn(targetColumn).filter((t) => t.id !== taskId);
        const newOrder = targetTasks.length;

        /* Optimistic update */
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId ? { ...t, column: targetColumn, order: newOrder } : t
            )
        );

        try {
            await taskService.move(taskId, { column: targetColumn, order: newOrder });
        } catch (err: any) {
            if (err?.response?.status === 403) {
                toast.error('Déplacement non autorisé — vous ne pouvez déplacer que vos propres tâches');
            } else {
                toast.error('Erreur lors du déplacement');
            }
            fetchData();
        }
    };

    /* Modal handlers */
    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (task: TaskDto) => {
        setEditing(task);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await taskService.delete(confirmDelete.id);
            toast.success('Tâche supprimée');
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

    /* ── Render ───────────────────────────────────────────── */

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tâches — Kanban</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} au total
                    </p>
                </div>
                {isAdmin && (
                    <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Nouvelle tâche
                    </button>
                )}
            </div>

            {/* Kanban board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.key}
                            column={col}
                            tasks={tasksByColumn(col.key)}
                            isAdmin={isAdmin}
                            onEdit={openEdit}
                            onDelete={(t) => setConfirmDelete(t)}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask && <TaskCardOverlay task={activeTask} />}
                </DragOverlay>
            </DndContext>

            {/* Create / Edit modal */}
            {modalOpen && (
                <TaskModal
                    editing={editing}
                    commercials={commercials}
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
                    message={`Supprimer la tâche « ${confirmDelete.title} » ?`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}

/* ── Kanban Column ───────────────────────────────────────── */

interface KanbanColumnProps {
    column: (typeof COLUMNS)[number];
    tasks: TaskDto[];
    isAdmin: boolean;
    onEdit: (task: TaskDto) => void;
    onDelete: (task: TaskDto) => void;
}

function KanbanColumn({ column, tasks, isAdmin, onEdit, onDelete }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.key });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                'bg-gray-100 rounded-lg p-4 flex flex-col min-h-[300px] transition-colors',
                isOver && 'bg-blue-50 ring-2 ring-blue-300'
            )}
        >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-4">
                <div className={clsx('w-3 h-3 rounded-full', column.color)} />
                <h2 className="font-semibold text-gray-700">{column.label}</h2>
                <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                    {tasks.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-3 flex-1">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        isAdmin={isAdmin}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
                {tasks.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">
                        Aucune tâche
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Task Card (draggable) ───────────────────────────────── */

interface TaskCardProps {
    task: TaskDto;
    isAdmin: boolean;
    onEdit: (task: TaskDto) => void;
    onDelete: (task: TaskDto) => void;
}

function TaskCard({ task, isAdmin, onEdit, onDelete }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style = transform
        ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
        : undefined;

    const priority = PRIORITY_CONFIG[task.priority];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                'bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-default transition-shadow',
                isDragging && 'opacity-50 shadow-lg'
            )}
        >
            <div className="flex items-start gap-2">
                {/* Drag handle */}
                <button
                    {...listeners}
                    {...attributes}
                    className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                    aria-label="Déplacer"
                >
                    <GripVertical className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0">
                    {/* Title + priority */}
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="font-medium text-gray-900 text-sm truncate cursor-pointer hover:text-primary-600"
                            onClick={() => onEdit(task)}
                        >
                            {task.title}
                        </span>
                        <span
                            className={clsx(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                                priority.classes
                            )}
                        >
                            {priority.label}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {task.assignedToName && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.assignedToName}
                            </span>
                        )}
                        {task.dueDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.dueDate), 'dd MMM yyyy', { locale: fr })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(task)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Modifier"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => onDelete(task)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Drag overlay card (visual clone while dragging) ─────── */

function TaskCardOverlay({ task }: { task: TaskDto }) {
    const priority = PRIORITY_CONFIG[task.priority];
    return (
        <div className="bg-white rounded-lg shadow-xl border border-primary-200 p-3 w-72 rotate-2">
            <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900 text-sm truncate">{task.title}</span>
                <span
                    className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        priority.classes
                    )}
                >
                    {priority.label}
                </span>
            </div>
        </div>
    );
}

/* ── Task Modal ──────────────────────────────────────────── */

interface TaskModalProps {
    editing: TaskDto | null;
    commercials: CommercialDto[];
    onClose: () => void;
    onSuccess: () => void;
}

function TaskModal({ editing, commercials, onClose, onSuccess }: TaskModalProps) {
    const isEdit = !!editing;

    const createForm = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            title: '',
            description: '',
            assignedToId: undefined,
            column: 'Todo',
            priority: 'Medium',
            dueDate: '',
        },
    });

    const updateForm = useForm<UpdateFormValues>({
        resolver: zodResolver(updateSchema),
        defaultValues: editing
            ? {
                title: editing.title,
                description: editing.description ?? '',
                assignedToId: editing.assignedToId ?? undefined,
                priority: editing.priority,
                dueDate: editing.dueDate ? editing.dueDate.slice(0, 10) : '',
            }
            : undefined,
    });

    const form = isEdit ? updateForm : createForm;
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = form as ReturnType<typeof useForm<CreateFormValues & UpdateFormValues>>;

    const onSubmit = async (values: CreateFormValues | UpdateFormValues) => {
        try {
            /* normalise empty strings to undefined */
            const data = { ...values };
            if (!data.description) data.description = undefined;
            if (!data.dueDate) data.dueDate = undefined;
            if (!data.assignedToId) data.assignedToId = undefined;

            if (isEdit && editing) {
                await taskService.update(editing.id, data as Partial<UpdateTaskRequest>);
                toast.success('Tâche mise à jour');
            } else {
                await taskService.create(data as CreateTaskRequest);
                toast.success('Tâche créée');
            }
            onSuccess();
        } catch {
            toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <Field label="Titre" error={errors.title?.message}>
                        <input {...register('title')} className="input" />
                    </Field>

                    <Field label="Description" error={errors.description?.message}>
                        <textarea {...register('description')} rows={3} className="input" />
                    </Field>

                    <Field label="Assigné à" error={errors.assignedToId?.message}>
                        <select {...register('assignedToId', { valueAsNumber: true })} className="input">
                            <option value="">— Non assigné —</option>
                            {commercials.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {!isEdit && (
                        <Field label="Colonne" error={(errors as Record<string, any>).column?.message}>
                            <select {...register('column')} className="input">
                                <option value="Todo">À faire</option>
                                <option value="InProgress">En cours</option>
                                <option value="Done">Terminé</option>
                            </select>
                        </Field>
                    )}

                    <Field label="Priorité" error={errors.priority?.message}>
                        <select {...register('priority')} className="input">
                            <option value="Low">Basse</option>
                            <option value="Medium">Moyenne</option>
                            <option value="High">Haute</option>
                            <option value="Critical">Critique</option>
                        </select>
                    </Field>

                    <Field label="Échéance" error={errors.dueDate?.message}>
                        <input type="date" {...register('dueDate')} className="input" />
                    </Field>

                    {/* Actions */}
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

export default TasksPage;
