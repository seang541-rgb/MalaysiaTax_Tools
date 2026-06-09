export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="text-center py-8">
        <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-3" />
        <div className="h-4 bg-gray-200 rounded w-96 mx-auto" />
      </div>
      <div className="space-y-4 mt-4">
        <div className="bg-white rounded-lg border p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-5 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-lg border p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-56" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
