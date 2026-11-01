import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db.js";

const subjects = [
  "English", "Hindi", "Marathi", "Maths 1", "Maths 2",
  "Science 1", "Science 2", "History & Political Science", "Geography"
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('In Progress', 'Completed', 'Needs Improvement')),
        remark TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, paper_id)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_papers_subject ON papers(subject_id, sort_order)",
      "CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_id)",
      "CREATE INDEX IF NOT EXISTS idx_progress_paper ON student_progress(paper_id)"
    ], "write");
    for (let i = 0; i < subjects.length; i++) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO subjects(name, sort_order) VALUES (?, ?)",
        args: [subjects[i], i + 1]
      });
    }
    return res.status(200).json({ ok: true, message: "Database is ready. Subjects initialized." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database initialization failed." });
  }
}
