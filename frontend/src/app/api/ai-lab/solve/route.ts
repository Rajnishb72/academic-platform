import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
    try {
        const { text, question } = (await req.json()) as { text: string; question: string };
        if (!text || !question)
            return NextResponse.json({ error: "Missing text or question." }, { status: 400 });
        const truncated = text.slice(0, 10000);

        const completion = await client.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an expert academic tutor. Answer the user's question based ONLY on the provided document text. Be clear, accurate, and concise. If the answer is not in the document, say so honestly.
Respond ONLY with valid JSON (no markdown fences):
{ "answer": "...", "confidence": "high|medium|low", "relatedTopics": ["...", "..."] }`,
                },
                { role: "user", content: `Document:\n${truncated}\n\nQuestion: ${question}` },
            ],
            temperature: 0.2,
            max_tokens: 1024,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
        return NextResponse.json(JSON.parse(cleaned));
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
    }
}
