import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-gray-600 mt-2">The page you’re looking for doesn’t exist or was moved.</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/orders"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
