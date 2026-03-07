export default function Loading() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
            <p className="text-sm animate-pulse" style={{ color: "var(--ax-text-muted, #94a3b8)" }}>Loading…</p>
        </div>
    );
}
