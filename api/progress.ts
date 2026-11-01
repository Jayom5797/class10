import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db.js";

const allowed = ["In Progress", "Completed", "Needs Improvement"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await db.execute(`
        SELECT student_id AS studentId, paper_id AS paperId, status, remark,
               updated_at AS updatedAt
        FROM student_progress
      `);
      return res.status(200).json(result.rows);
    }
    if (req.method === "PUT") {
      const studentId = Number(req.body?.studentId);
      const paperId = Number(req.body?.paperId);
      const status = String(req.body?.status ?? "");
      const remark = String(req.body?.remark ?? "");
      if (!Number.isInteger(studentId) || !Number.isInteger(paperId) || !allowed.includes(status)) {
        return res.status(400).json({ error: "Student, paper and valid status are required." });
      }
      const result = await db.execute({
        sql: `INSERT INTO student_progress(student_id, paper_id, status, remark, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(student_id, paper_id) DO UPDATE SET
              status = excluded.status, remark = excluded.remark, updated_at = CURRENT_TIMESTAMP
              RETURNING student_id AS studentId, paper_id AS paperId, status, remark, updated_at AS updatedAt`,
        args: [studentId, paperId, status, remark]
      });
      return res.status(200).json(result.rows[0]);
    }
    if (req.method === "DELETE") {
      const studentId = Number(req.query.studentId);
      const paperId = Number(req.query.paperId);
      if (!Number.isInteger(studentId) || !Number.isInteger(paperId)) return res.status(400).json({ error: "Student and paper are required." });
      await db.execute({ sql: "DELETE FROM student_progress WHERE student_id = ? AND paper_id = ?", args: [studentId, paperId] });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not process progress request." });
  }
}
