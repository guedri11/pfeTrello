import clsx from 'clsx';

interface SpinnerProps {
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

function Spinner({ fullScreen = false, size = 'md' }: SpinnerProps) {
    const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];

    const spinner = (
        <div
            className={clsx(
                'animate-spin rounded-full border-2 border-gray-300 border-t-primary-600',
                sizeClass
            )}
        />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/75 z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
}

export default Spinner;
