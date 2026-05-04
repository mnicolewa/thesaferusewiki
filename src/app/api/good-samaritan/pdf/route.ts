import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getGoodSamaritanNote, resolveStateCode } from "@/lib/good-samaritan";

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function wrapText(text: string, maxChars = 92) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export async function GET(request: NextRequest) {
  const stateQuery = request.nextUrl.searchParams.get("state");
  const resolvedCode = resolveStateCode(stateQuery);
  const note = getGoodSamaritanNote(stateQuery);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 760;
  const left = 50;

  const drawLineBlock = (
    label: string,
    text: string,
    options?: { size?: number; gapAfter?: number; color?: [number, number, number] }
  ) => {
    const size = options?.size ?? 11;
    const gapAfter = options?.gapAfter ?? 6;
    const color = options?.color ?? [0.05, 0.09, 0.16];

    page.drawText(label, {
      x: left,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.19, 0.28),
    });
    y -= 16;

    const lines = wrapText(text, 90);
    for (const line of lines) {
      page.drawText(line, {
        x: left,
        y,
        size,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
      y -= size + 4;
    }

    y -= gapAfter;
  };

  page.drawRectangle({
    x: 40,
    y: 40,
    width: 532,
    height: 712,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
  });

  page.drawText("Good Samaritan Overdose Cheat Sheet", {
    x: left,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.05, 0.09, 0.16),
  });
  y -= 30;

  page.drawText(`State: ${note.stateName}${resolvedCode ? ` (${resolvedCode})` : ""}`, {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.13, 0.16, 0.26),
  });
  y -= 24;

  drawLineBlock("What this usually means", note.summary);
  drawLineBlock("Caution", note.caution, { color: [0.26, 0.2, 0.08] });

  page.drawText("Common protections to know", {
    x: left,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.19, 0.28),
  });
  y -= 16;

  for (const bullet of note.likelyCoverage) {
    const lines = wrapText(`- ${bullet}`, 88);
    for (const line of lines) {
      page.drawText(line, {
        x: left,
        y,
        size: 11,
        font,
        color: rgb(0.05, 0.09, 0.16),
      });
      y -= 15;
    }
  }

  y -= 8;
  drawLineBlock("If you call 911", note.whenCalling, { color: [0.02, 0.25, 0.22] });

  page.drawText("Emergency: Call 911 | Poison Control: 1-800-222-1222", {
    x: left,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.36, 0.02, 0.02),
  });
  y -= 18;

  page.drawText(`Source: ${note.officialResourceUrl}`, {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.24, 0.32),
  });
  y -= 14;

  page.drawText(`Last reviewed: ${note.lastReviewed} | Status: ${note.status}`, {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.24, 0.32),
  });
  y -= 16;

  page.drawText("Not legal advice. Laws can change. Verify current state policy before relying on this card.", {
    x: left,
    y,
    size: 9.5,
    font,
    color: rgb(0.32, 0.32, 0.35),
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBody = Uint8Array.from(pdfBytes);
  const stateSlug = sanitizeFilename(note.stateName);

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="good-samaritan-${stateSlug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
