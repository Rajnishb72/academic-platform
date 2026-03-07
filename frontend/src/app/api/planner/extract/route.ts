import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Text model (fast & cheap for PDF text)
const TEXT_MODEL = "llama-3.3-70b-versatile";
// Vision model (reads images)
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are an academic syllabus parser. Given a syllabus or curriculum (as text or an image), identify and extract all chapters, units, modules, or major topics. 
You MUST return ONLY a valid JSON object with a single key "chapters" containing an array of chapter objects. Do not include markdown formatting or prose.

Each chapter object must have:
- "title": string (the chapter/unit/topic name, cleaned up)
- "estimatedDays": number (1–14, a reasonable study estimate based on weightage)
- "topics": string[] (2-5 sub-topics if mentioned, otherwise infer likely ones based on the title)

Example output:
{
  "chapters": [
    { "title": "Introduction to Mechanics", "estimatedDays": 3, "topics": ["Newton's Laws", "Kinematics", "Free body diagrams"] },
    { "title": "Thermodynamics", "estimatedDays": 5, "topics": ["Heat transfer", "Laws of thermodynamics", "Entropy"] }
  ]
}

If you cannot identify any chapters, return { "chapters": [] }.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Image path: base64 image sent directly to vision model ───────────────
    if (body.imageBase64 && body.mimeType) {
      const { imageBase64, mimeType } = body as { imageBase64: string; mimeType: string };

      const response = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: `${SYSTEM_PROMPT}\n\nExtract all chapters/units/topics visible in this syllabus image.`,
              },
            ],
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
      return NextResponse.json({ chapters });
    }

    // ── Text path: extracted PDF text ─────────────────────────────────────────
    const { text } = body as { text?: string };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const truncated = text.slice(0, 12000);

    const response = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract chapters from this syllabus:\n\n${truncated}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];

    return NextResponse.json({ chapters });
  } catch (err: unknown) {
    console.error("[planner/extract]", err);
    return NextResponse.json(
      { error: "Extraction failed", chapters: [] },
      { status: 500 }
    );
  }
}
