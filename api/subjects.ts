import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await db.execute("SELECT id, name, sort_order AS sortOrder FROM subjects ORDER BY sort_order");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load subjects. Run /api/bootstrap first." });
  }
}
