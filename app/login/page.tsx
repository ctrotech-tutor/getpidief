"use client";

import { useState } from "react";
// Import from Shadcn UI component (We'll generate the Button component shortly)
import { Button } from "@/components/ui/button";

// Future Implementation logic placeholder:
// import { signInWithPopup } from "firebase/auth";
// import { auth, googleProvider } from "@/lib/firebase/client";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // Configuration prepared for Google login exclusively.
            // const result = await signInWithPopup(auth, googleProvider);
            // ... redirect user or handle auth context
            console.log("Google Login process initialized.");
        } catch (error) {
            console.error("Login encountered an error:", error);
        } finally {
            // Fake delay for UI simulation
            setTimeout(() => setIsLoading(false), 800);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-zinc-900 p-10 shadow-xl ring-1 ring-zinc-200/50 dark:ring-zinc-800/50">

                {/* Header Section */}
                <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-6">
                        <svg
                            className=" h-6 w-6 text-white dark:text-zinc-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Welcome to getpidief
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Sign in with your Google account to access or manage study materials.
                    </p>
                </div>

                {/* Action Section */}
                <div className="mt-8 space-y-6">
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        variant="outline"
                        className="flex w-full items-center justify-center gap-3 rounded-xl py-6 text-base font-medium transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                        {isLoading ? (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-white"></span>
                        ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        )}
                        Sign in with Google
                    </Button>
                </div>

                {/* Footer Section */}
                <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
