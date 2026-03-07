import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an expert academic tutor. Given extracted text from a chapter or study material, you will:
1. Write a clear, concise summary of the chapter (3-5 paragraphs).
2. Generate 8-10 important exam-style questions with detailed answers based on the content.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "summary": "...",
  "questions": [
    { "question": "...", "answer": "..." },
    ...
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { text, fileName } = (await req.json()) as {
      text: string;
      fileName?: string;
    };

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        {
          error:
            "The PDF text is too short or empty. Please upload a chapter with more content.",
        },
        { status: 400 },
      );
    }

    // Cap at ~12,000 chars to stay within context limits
    const truncated = text.slice(0, 12000);

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Chapter${fileName ? ` from "${fileName}"` : ""}:\n\n${truncated}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Strip markdown code fences if model wraps the response
    const cleaned = raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed: {
      summary: string;
      questions: { question: string; answer: string }[];
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned unexpected format. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
