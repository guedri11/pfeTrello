import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, UserRole } from '@/types';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    email: string | null;
    fullName: string | null;
    role: UserRole | null;
    commercialId: number | null;
    setAuth: (auth: AuthResponse) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            email: null,
            fullName: null,
            role: null,
            commercialId: null,

            setAuth: (auth: AuthResponse) =>
                set({
                    accessToken: auth.accessToken,
                    refreshToken: auth.refreshToken,
                    email: auth.email,
                    fullName: auth.fullName,
                    role: auth.role,
                    commercialId: auth.commercialId ?? null,
                }),

            logout: () =>
                set({
                    accessToken: null,
                    refreshToken: null,
                    email: null,
                    fullName: null,
                    role: null,
                    commercialId: null,
                }),
        }),
        {
            name: 'pfet-auth',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                email: state.email,
                fullName: state.fullName,
                role: state.role,
                commercialId: state.commercialId,
            }),
        }
    )
);
