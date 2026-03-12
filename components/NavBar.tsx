import Link from "next/link";

export default function NavBar() {
  return (
    <nav
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-teal-600/40 rounded-sm"
          aria-label="Zipcast — home"
        >
          {/* Logo mark */}
          <div className="size-7 rounded flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 14 14"
              fill="none"
              className="text-teal-800"
            >
              <path
                d="M7 1L13 5.5V13H9V9H5V13H1V5.5L7 1Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-serif text-lg text-gray-950 group-hover:text-teal-800 transition-colors">
            Zipcast
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/40 rounded-sm px-1 py-0.5"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
