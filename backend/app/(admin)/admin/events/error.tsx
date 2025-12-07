'use client';

interface EventsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventsError({ error, reset }: EventsErrorProps) {
  console.error('EventsError:', error);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold text-red-700">
        Fehler beim Laden der Events
      </h1>
      <p className="text-sm text-slate-600">
        Beim Laden der Events ist ein unerwarteter Fehler aufgetreten.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
