export default function DocumentWorkspaceLoading() {
  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
        <div className="flex-1" />
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF area skeleton */}
        <div className="flex-1 flex items-center justify-center bg-[#080d1c]">
          <div className="flex flex-col items-center gap-3 text-white/20">
            <svg className="animate-spin w-10 h-10" viewBox="0 0 32 32" fill="none" aria-hidden>
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
              <path d="M16 4a12 12 0 0112 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium">Loading document…</p>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <aside className="w-[380px] shrink-0 border-l border-border p-5 space-y-4 bg-background">
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-8 w-16 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t border-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
