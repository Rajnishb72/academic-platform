import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { chapters, targetDate, dailyHours, planName, intensity = "normal" } = await req.json();

    if (!chapters || !targetDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(targetDate);
    const startDate = new Date(today);
    const totalDays = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
    );

    const chapterList = (chapters as { title: string; estimatedDays: number; topics: string[] }[])
      .map((c, i) => `${i + 1}. "${c.title}" (estimated ${c.estimatedDays} days, topics: ${c.topics?.join(", ") || "general"})`)
      .join("\n");

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert academic study planner. Given a list of chapters with estimated days, a deadline, and available study hours per day, generate an optimal study schedule.

Return ONLY a JSON object — no markdown, no prose, no code fences.

The JSON must have exactly this shape:
{
  "feasible": boolean,
  "warning": string | null,
  "totalDaysNeeded": number,
  "totalDaysAvailable": number,
  "schedule": [
    {
      "chapterIndex": number (1-based),
      "title": string,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "daysAllocated": number (minimum 1, never 0 or negative),
      "overview": string (2-3 sentence summary of what this chapter covers and why it matters — helps the student understand the chapter before studying),
      "dailyGoals": string[] (2-3 specific, actionable tasks),
      "studyTip": string (1-2 sentences of a specific, practical tip for this chapter),
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "overallStrategy": string,
  "motivationalNote": string
}

Intensity mode: ${intensity === "light" ? "LIGHT — add generous buffer days between chapters, shorter daily sessions, relaxed pacing" : intensity === "aggressive" ? "AGGRESSIVE — pack chapters tightly with minimal buffer, maximise daily coverage, push hard" : "NORMAL — balanced approach with moderate daily progress and small buffers"}.

Rules:
- Schedule starts from today (${today})
- totalDaysAvailable is exactly ${totalDays}
- All startDate and endDate values MUST be between ${today} and ${targetDate} inclusive — never before today, never after ${targetDate}
- daysAllocated must be >= 1 for every chapter
- Compress chapters proportionally to fit within the ${totalDays} available days
- If total estimated days exceed available days, compress proportionally and set warning
- Each chapter's endDate must equal the next chapter's startDate or later (no overlap)
- dailyGoals: 2-3 actionable tasks per chapter in plain language
- studyTip: a specific, actionable tip for that chapter (1-2 sentences)
- overview: a clear 2-3 sentence explanation of what this chapter covers, key concepts, and why it is important in the broader subject context
- overallStrategy: 2-3 sentences describing the overall study approach
- motivationalNote: an encouraging 1-sentence message`,
        },
        {
          role: "user",
          content: `Plan: "${planName}"
Chapters:
${chapterList}

Available days: ${totalDays} (from ${today} to ${targetDate})
Daily study hours: ${dailyHours}h

Generate the optimal study schedule.`,
        },
      ],
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const plan = JSON.parse(clean);

    // ── Safety clamps ──────────────────────────────────────────────────────────
    // Ensure dates never go out of bounds and daysAllocated never negative
    if (Array.isArray(plan.schedule)) {
      const todayISO = today;
      plan.schedule = plan.schedule.map((slot: { chapterIndex: number; title: string; startDate: string; endDate: string; daysAllocated: number; overview?: string; dailyGoals: string[]; studyTip: string; difficulty: string }) => {
        const s = slot.startDate < todayISO ? todayISO : slot.startDate;
        const e = slot.endDate > targetDate ? targetDate : slot.endDate < s ? s : slot.endDate;
        const days = Math.max(1, slot.daysAllocated ?? 1);
        return { ...slot, startDate: s, endDate: e, daysAllocated: days };
      });
    }

    return NextResponse.json({ plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[planner/schedule]", message, err);
    return NextResponse.json({ error: `Schedule generation failed: ${message}` }, { status: 500 });
  }
}
