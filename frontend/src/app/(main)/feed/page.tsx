"use client";

import { useState } from "react";
import { Waves } from "lucide-react";

const TABS = ["For You", "Friends", "Campus", "Trending", "Achievements"];

export default function FeedPage() {
    const [activeTab, setActiveTab] = useState("For You");

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col">
            {/* ── Module Sub-Navbar ── */}
            <div className="sticky top-16 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
                <div className="mx-auto max-w-4xl px-4 sm:px-6">
                    <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors ${isActive
                                            ? "text-blue-400"
                                            : "text-slate-400 hover:text-slate-200"
                                        }`}
                                >
                                    {tab}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-500" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* ── Feed Content Area ── */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
                <div className="flex max-w-sm flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 shadow-inner">
                        <Waves className="h-10 w-10 text-blue-500/60" />
                    </div>

                    {/* Heading */}
                    <h2 className="text-xl font-semibold text-slate-100">
                        Feed Engine Initializing...
                    </h2>

                    {/* Description */}
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                        Your personalized academic stream will appear here once you join a
                        campus, follow friends, or contribute to the library.
                    </p>

                    {/* Action hints */}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        {[
                            { label: "Join a Campus", href: "/campus" },
                            { label: "Visit Library", href: "/library" },
                            { label: "Browse Forums", href: "/forums" },
                        ].map(({ label, href }) => (
                            <a
                                key={label}
                                href={href}
                                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-blue-400"
                            >
                                {label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
