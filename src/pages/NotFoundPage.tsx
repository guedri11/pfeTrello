import { Link } from 'react-router-dom';

function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl font-bold text-primary-900">404</h1>
            <p className="text-xl text-gray-600 mt-4 mb-8">Page non trouvée</p>
            <Link to="/dashboard" className="btn-primary">
                Retour au tableau de bord
            </Link>
        </div>
    );
}

export default NotFoundPage;
