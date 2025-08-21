import Link from "next/link";

interface Props {
  _id: string;
  courseCode: string;
  title: string;
  isPrivate?: boolean;
}

export default function DirectoryCard({ _id, courseCode, title, isPrivate = false }: Props) {
  return (
    <div className="group flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-100 text-center text-xs font-semibold leading-tight text-blue-700"
            title={courseCode}
          >
            <span className="px-1 truncate">{courseCode}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-gray-900" title={title}>
              {title}
            </div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                isPrivate 
                  ? 'border-purple-200 bg-purple-50 text-purple-700' 
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}>
                {isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/${isPrivate ? 'private' : 'public'}-resources/folders/${_id}`}
          aria-label={`View resources for ${title}`}
          className="inline-flex w-full items-center justify-center h-9 rounded-md border border-transparent bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View Resources
        </Link>
      </div>
    </div>
  );
}
