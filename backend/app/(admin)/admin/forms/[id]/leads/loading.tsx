// app/(admin)/admin/forms/[id]/leads/loading.tsx

export default function FormLeadsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="mt-4 h-48 w-full rounded-lg bg-gray-100 animate-pulse" />
    </div>
  );
}
