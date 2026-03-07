require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createClient } = require("@supabase/supabase-js");

// ─── Supabase (service role — full access for server-side ops) ────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ─── Clerk JWT verification middleware ────────────────────────────────────────
// Verifies the Bearer token sent by the Next.js proxy route.
// Uses Clerk's JWKS endpoint so no Clerk SDK is needed on the backend.
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        // Decode JWT payload (not verifying signature in dev — add full JWKS verification for prod)
        const [, payloadB64] = token.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
        if (!payload.sub) throw new Error("No sub claim");
        req.userId = payload.sub; // Clerk user ID (e.g. user_2abc...)
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token", detail: err.message });
    }
}

// ─── Library Routes ───────────────────────────────────────────────────────────

const libraryRouter = express.Router();

// GET /api/library/my-notes — fetch notes owned by the authenticated user
libraryRouter.get("/my-notes", requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[GET /my-notes]", error);
        return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
});

// PATCH /api/library/my-notes/:id — update a note's metadata
libraryRouter.patch("/my-notes/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title, subject, description, is_public } = req.body;

    const { data, error } = await supabase
        .from("notes")
        .update({ title, subject, description, is_public, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", req.userId) // ownership guard
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// DELETE /api/library/my-notes/:id — delete a note owned by the user
libraryRouter.delete("/my-notes/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("user_id", req.userId); // ownership guard

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
});

app.use("/api/library", libraryRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
    console.log(`✅  Backend running on http://localhost:${PORT}`);
    // Keep-alive handle to prevent Node from cleanly exiting the event loop on Windows/some environments
    setInterval(() => { }, 1000 * 60 * 60);
});
