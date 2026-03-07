import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
    try {
        const { text } = (await req.json()) as { text: string };
        if (!text || text.trim().length < 100)
            return NextResponse.json({ error: "Text too short." }, { status: 400 });
        const truncated = text.slice(0, 12000);

        const completion = await client.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an expert flashcard creator. Generate exactly 10 flashcards from the given text.
Respond ONLY with valid JSON (no markdown fences):
{
  "flashcards": [
    { "term": "...", "definition": "..." }
  ]
}`,
                },
                { role: "user", content: truncated },
            ],
            temperature: 0.3,
            max_tokens: 1024,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
        return NextResponse.json(JSON.parse(cleaned));
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
    }
}
