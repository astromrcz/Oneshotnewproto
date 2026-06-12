import { useNavigate } from 'react-router';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <p className="text-6xl font-black text-neutral-800">404</p>
      <p className="text-neutral-500 mt-2 mb-6">Page not found</p>
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
