import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

type ExtractedReceipt = {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
};

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const PROMPT = `You are an OCR extractor for Indonesian receipts/invoices (nota/faktur).
Read the image and return the data of the purchase. Rules:
- amount: the GRAND TOTAL paid, as an integer number of rupiah, no separators, no "Rp". If a total is unclear, use the largest sensible total. null if not found.
- date: transaction date in ISO format YYYY-MM-DD. null if not found.
- vendor: the store / merchant name (usually at the top). null if not found.
- description: a short Indonesian summary of the items bought (max ~60 chars). null if not found.
Return ONLY the data, no commentary.`;

export const extractReceipt = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<ExtractedReceipt> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new ConvexError("GEMINI_API_KEY not set");

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new ConvexError("Receipt image not found");

    const buf = await blob.arrayBuffer();
    const base64 = toBase64(buf);
    const mimeType = blob.type || "image/jpeg";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                amount: { type: "integer", nullable: true },
                date: { type: "string", nullable: true },
                vendor: { type: "string", nullable: true },
                description: { type: "string", nullable: true },
              },
              required: ["amount", "date", "vendor", "description"],
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new ConvexError(`Gemini error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new ConvexError("Gemini returned no content");

    let parsed: ExtractedReceipt;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ConvexError("Failed to parse Gemini response");
    }

    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      date: parsed.date ?? null,
      vendor: parsed.vendor ?? null,
      description: parsed.description ?? null,
    };
  },
});
