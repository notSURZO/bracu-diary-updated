import Image from "next/image";

interface FileInfo {
  url: string;
  mime?: string;
  bytes?: number;
  provider?: string;
  publicId?: string;
  originalName?: string;
}

interface Props {
  title: string;
  description?: string;
  file: FileInfo;
  ownerAvatarUrl?: string | null;
}

export default function ResourceCard({ title, description, file, ownerAvatarUrl }: Props) {
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open resource ${title}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
          {ownerAvatarUrl ? (
            <Image src={ownerAvatarUrl} alt="Uploader" fill sizes="40px" className="object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-gray-400 text-xs">U</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-gray-900">{title}</div>
          {description ? (
            <div className="mt-1 line-clamp-2 text-sm text-gray-600">{description}</div>
          ) : null}
          <div className="mt-2 text-xs text-gray-500">{file.originalName || file.url}</div>
        </div>
      </div>
    </a>
  );
}
