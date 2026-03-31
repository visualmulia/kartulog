import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, game, expansion, rarity, condition, gradingAgency, gradeScore } = body;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Kamu adalah appraiser TCG profesional Indonesia. Estimasi harga pasar kartu ini dalam Rupiah:
Game: ${game}
Nama Kartu: ${name}
Set/Expansion: ${expansion || "-"}
Rarity: ${rarity || "-"}
Kondisi: ${condition || "-"}
Grading: ${gradingAgency} ${gradeScore || ""}

WAJIB: Jawab HANYA dengan SATU ANGKA bulat. Contoh: 350000
Jika tidak tahu, jawab: 0`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim().replace(/[^0-9]/g, "") ?? "0";
    return NextResponse.json({ value: text });

  } catch (e) {
    console.error("Estimate error:", e);
    return NextResponse.json({ value: "0" }, { status: 500 });
  }
}