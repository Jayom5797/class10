import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await db.execute(`
        SELECT p.id, p.name, p.subject_id AS subjectId, p.sort_order AS sortOrder,
               s.name AS subjectName
        FROM papers p JOIN subjects s ON s.id = p.subject_id
        ORDER BY s.sort_order, p.sort_order, p.id
      `);
      return res.status(200).json(result.rows);
    }
    if (req.method === "POST") {
      const subjectId = Number(req.body?.subjectId);
      const name = String(req.body?.name ?? "").trim();
      if (!Number.isInteger(subjectId) || !name) return res.status(400).json({ error: "Subject and paper name are required." });
      const count = await db.execute({ sql: "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM papers WHERE subject_id = ?", args: [subjectId] });
      const order = Number(count.rows[0].next);
      const result = await db.execute({
        sql: "INSERT INTO papers(subject_id, name, sort_order) VALUES (?, ?, ?) RETURNING id, name, subject_id AS subjectId, sort_order AS sortOrder",
        args: [subjectId, name, order]
      });
      return res.status(201).json(result.rows[0]);
    }
    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Valid paper id is required." });
      await db.execute({ sql: "DELETE FROM papers WHERE id = ?", args: [id] });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE")) return res.status(409).json({ error: "A paper with this name already exists in that subject." });
    console.error(error);
    return res.status(500).json({ error: "Could not process papers request." });
  }
}
