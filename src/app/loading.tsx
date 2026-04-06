export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6">
        
        {/* Logo / Brand */}
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          getpidief
        </div>

        {/* Spinner */}
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
        </div>

        {/* Subtle text */}
        <p className="text-sm text-muted-foreground">
          Loading...
        </p>

      </div>
    </div>
  );
}
