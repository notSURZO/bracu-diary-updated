import Link from "next/link";

interface Props {
  courseCode: string;
  courseName: string;
  resourceCount: number;
}

export default function CourseFolderCard({ courseCode, courseName, resourceCount }: Props) {
  return (
    <Link
      href={`/public-resources/${encodeURIComponent(courseCode)}`}
      className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-100 text-blue-700 font-semibold">
          {courseCode}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500">{courseCode}</div>
          <div className="text-base font-medium text-gray-900">{courseName}</div>
          <div className="text-xs text-gray-500 mt-1">{resourceCount} resources</div>
        </div>
      </div>
    </Link>
  );
}
