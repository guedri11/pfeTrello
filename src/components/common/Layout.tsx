import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    CalendarCheck,
    KanbanSquare,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
    {
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: ['Admin', 'Commercial', 'Supervisor'],
    },
    {
        to: '/commercials',
        icon: Users,
        label: 'Commerciaux',
        roles: ['Admin', 'Supervisor'],
    },
    {
        to: '/clients',
        icon: UserCheck,
        label: 'Clients',
        roles: ['Admin', 'Commercial', 'Supervisor'],
    },
    {
        to: '/visits',
        icon: CalendarCheck,
        label: 'Visites',
        roles: ['Admin', 'Commercial', 'Supervisor'],
    },
    {
        to: '/tasks',
        icon: KanbanSquare,
        label: 'Tâches',
        roles: ['Admin', 'Commercial', 'Supervisor'],
    },
];

function Layout() {
    const fullName = useAuthStore((s) => s.fullName);
    const role = useAuthStore((s) => s.role);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filtered = navItems.filter(
        (item) => role && item.roles.includes(role)
    );

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white flex flex-col transition-transform duration-200',
                    mobileOpen
                        ? 'translate-x-0'
                        : '-translate-x-full md:translate-x-0'
                )}
            >
                <div className="flex items-center justify-between p-6 border-b border-primary-700">
                    <span className="text-xl font-bold">PFE Trello</span>
                    <button
                        className="md:hidden"
                        onClick={() => setMobileOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {filtered.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary-700 text-white'
                                        : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                                )
                            }
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-primary-700">
                    <div className="text-sm text-primary-200 mb-3">
                        <p className="font-medium text-white">{fullName}</p>
                        <p>{role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-primary-200 hover:text-white hover:bg-primary-800 rounded-lg text-sm transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center md:hidden">
                    <button onClick={() => setMobileOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
