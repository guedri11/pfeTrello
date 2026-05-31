import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const schema = z
    .object({
        firstName: z.string().min(2, 'Minimum 2 caractères'),
        lastName: z.string().min(2, 'Minimum 2 caractères'),
        email: z.string().email('Email invalide'),
        password: z.string().min(6, 'Minimum 6 caractères'),
        confirmPassword: z.string(),
        role: z.enum(['Admin', 'Commercial', 'Supervisor'] as const),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
    });

type FormValues = z.infer<typeof schema>;

function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { role: 'Commercial' },
    });

    const onSubmit = async (values: FormValues) => {
        try {
            const { confirmPassword: _, ...data } = values;
            const auth = await authService.register(data);
            setAuth(auth);
            toast.success('Compte créé avec succès');
            navigate('/dashboard', { replace: true });
        } catch {
            toast.error("Erreur lors de l'inscription");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-primary-900">VisioPro</h1>
                    <p className="text-gray-500 mt-2">Créer un compte</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prénom
                            </label>
                            <input
                                {...register('firstName')}
                                className="input"
                                placeholder="Jean"
                            />
                            {errors.firstName && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.firstName.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom
                            </label>
                            <input
                                {...register('lastName')}
                                className="input"
                                placeholder="Dupont"
                            />
                            {errors.lastName && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.lastName.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            {...register('email')}
                            className="input"
                            placeholder="votre@email.com"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rôle
                        </label>
                        <select {...register('role')} className="input">
                            <option value="Commercial">Commercial</option>
                            <option value="Admin">Admin</option>
                            <option value="Supervisor">Superviseur</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            {...register('password')}
                            className="input"
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmer le mot de passe
                        </label>
                        <input
                            type="password"
                            {...register('confirmPassword')}
                            className="input"
                            placeholder="••••••••"
                        />
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-3 text-base"
                    >
                        {isSubmitting ? 'Création...' : "S'inscrire"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Déjà un compte ?{' '}
                    <Link
                        to="/login"
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;
