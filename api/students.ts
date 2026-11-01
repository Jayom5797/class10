import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await db.execute("SELECT id, name FROM students ORDER BY name COLLATE NOCASE");
      return res.status(200).json(result.rows);
    }
    if (req.method === "POST") {
      const name = String(req.body?.name ?? "").trim();
      if (!name) return res.status(400).json({ error: "Student name is required." });
      const result = await db.execute({ sql: "INSERT INTO students(name) VALUES (?) RETURNING id, name", args: [name] });
      return res.status(201).json(result.rows[0]);
    }
    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Valid student id is required." });
      await db.execute({ sql: "DELETE FROM students WHERE id = ?", args: [id] });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not process students request." });
  }
}
