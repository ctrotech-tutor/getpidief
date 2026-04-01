import Link from "next/link";
import { Search, User } from "lucide-react";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center mx-auto px-4 md:px-6">
                <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
                    <span className="font-bold text-xl tracking-tight text-foreground">getpidief</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline-block border-l pl-2 border-border ml-2">
                        By Ctrotech
                    </span>
                </Link>

                <div className="flex flex-1 items-center justify-end space-x-4">
                    <div className="w-full max-w-sm hidden md:flex items-center relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search study materials..."
                            className="flex h-9 w-full rounded-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                        />
                    </div>
                    <nav className="flex items-center space-x-2">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 border border-input shadow-sm bg-background text-foreground"
                        >
                            <User className="mr-2 h-4 w-4" />
                            Sign In
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}
