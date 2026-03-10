import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <div className="max-w-md">
        <p className="text-8xl font-extrabold text-[#CD7F32]">404</p>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Page not found
        </h1>
        <p className="mt-4 text-gray-500">
          Sorry, the site you&apos;re looking for doesn&apos;t exist or
          hasn&apos;t been set up yet.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#CD7F32] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#8B4513]"
          >
            Go to Home
          </Link>
          <Link
            href="/signin?next=/admin"
            className="inline-flex items-center justify-center rounded-lg border border-[#CD7F32] px-6 py-3 font-semibold text-[#CD7F32] transition-colors hover:bg-[#CD7F32] hover:text-white"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
