"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

/**
 * Renders the first page of a PDF as a canvas thumbnail.
 * Falls back to a styled placeholder if loading fails.
 */
export default function PdfThumbnail({
    url,
    className = "",
    accentColor = "text-blue-400",
    gradientClass = "from-slate-800/40 to-slate-900/60",
}: {
    url: string;
    className?: string;
    accentColor?: string;
    gradientClass?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            try {
                const pdfjsLib = await import("pdfjs-dist");
                // Use the bundled worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

                const loadingTask = pdfjsLib.getDocument({
                    url,
                    disableAutoFetch: true,
                    disableStream: true,
                });

                const pdf = await loadingTask.promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                // Scale to fit the container width (300px target for card thumbnails)
                const targetWidth = 300;
                const viewport = page.getViewport({ scale: 1 });
                const scale = targetWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
                if (!cancelled) setLoaded(true);
            } catch {
                if (!cancelled) setError(true);
            }
        }

        render();
        return () => { cancelled = true; };
    }, [url]);

    if (error || !url) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br ${gradientClass} ${className}`}>
                <div className="flex flex-col items-center gap-1">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm">
                        <FileText className={`h-6 w-6 ${accentColor} opacity-60`} />
                    </div>
                    <span className="text-[9px] font-medium text-white/25 tracking-widest uppercase">PDF</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Loading shimmer */}
            {!loaded && (
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientClass} animate-pulse`}>
                    <div className="flex flex-col items-center gap-1">
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"><FileText className={`h-5 w-5 ${accentColor} opacity-40`} /></div>
                    </div>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                style={{ objectFit: "cover" }}
            />
        </div>
    );
}
