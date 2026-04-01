import Link from "next/link";
import { Search, BookOpen, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full">
      {/* 
        Hero Section (Static Route Component)
        Optimized for clean minimal loading and fast LCP. No dynamic server data required here. 
      */}
      <section className="w-full py-16 md:py-24 lg:py-32 xl:py-48 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center border-b">
        <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-4 mx-auto">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Your Hub for Academic PDFs
            </h1>
            <p className="mx-auto max-w-[700px] text-zinc-500 md:text-xl dark:text-zinc-400">
              Clean, simple, and organized. Find the study materials you need to succeed, powered by Ctrotech Tutor Insights.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-2 relative mt-8">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title, subject, or author..."
              className="flex h-12 w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-11 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div className="flex space-x-4 mt-6">
            <Link
              href="/search"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-zinc-50 shadow transition-colors hover:bg-zinc-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90"
            >
              Browse All
            </Link>
          </div>
        </div>
      </section>

      {/* Features/Categories Hub */}
      <section className="w-full py-12 md:py-24 lg:py-32 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 flex-1">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12 max-w-5xl mx-auto">
            <div className="flex flex-col justify-center items-center text-center space-y-4 p-6 rounded-2xl transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <BookOpen className="h-7 w-7 text-zinc-900 dark:text-zinc-50" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">Organized Subjects</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Browse academic materials cleanly categorized by specific subjects and topics.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center text-center space-y-4 p-6 rounded-2xl transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <Search className="h-7 w-7 text-zinc-900 dark:text-zinc-50" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">Instant Search</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Find exactly what you need with blazing fast search and intuitive filters.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center text-center space-y-4 p-6 rounded-2xl transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <Layers className="h-7 w-7 text-zinc-900 dark:text-zinc-50" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">Easy File Access</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  View resource details and immediately download PDF files with zero hassle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
