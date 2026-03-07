"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 400);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <AnimatePresence>
            {show && (
                <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-xl shadow-xl backdrop-blur-md transition-colors hover:scale-105 active:scale-95"
                    style={{
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)",
                    }}
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="h-4 w-4 text-white" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
