import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp,
  Download, GraduationCap, LayoutDashboard, Plus, Search, Settings2,
  Trash2, Users, X
} from "lucide-react";

type Student = { id: number; name: string };
type Subject = { id: number; name: string; sortOrder: number };
type Paper = { id: number; name: string; subjectId: number; sortOrder: number; subjectName?: string };
type Progress = { studentId: number; paperId: number; status: string; remark: string; updatedAt?: string };
type View = "home" | "student-list" | "student" | "subject-list" | "subject" | "manage";
type Status = "" | "In Progress" | "Completed" | "Needs Improvement";

const statusOptions: Status[] = ["", "In Progress", "Completed", "Needs Improvement"];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [view, setView] = useState<View>("home");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [edit, setEdit] = useState<{ student: Student; paper: Paper; current?: Progress } | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("In Progress");
  const [editRemark, setEditRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [newStudent, setNewStudent] = useState("");
  const [newPaper, setNewPaper] = useState("");
  const [paperSubject, setPaperSubject] = useState<number | "">("");

  async function refresh() {
    setError("");
    try {
      const [s, sub, p, pr] = await Promise.all([
        api<Student[]>("/api/students"),
        api<Subject[]>("/api/subjects"),
        api<Paper[]>("/api/papers"),
        api<Progress[]>("/api/progress")
      ]);
      setStudents(s); setSubjects(sub); setPapers(p); setProgress(pr);
      if (paperSubject === "" && sub.length) setPaperSubject(sub[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredStudents = useMemo(() => students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const studentPapers = useMemo(() => papers.filter(p => subjects.some(s => s.id === p.subjectId)), [papers, subjects]);
  const subjectPapers = useMemo(() => selectedSubject ? papers.filter(p => p.subjectId === selectedSubject.id) : [], [papers, selectedSubject]);
  const getProgress = (studentId: number, paperId: number) => progress.find(p => p.studentId === studentId && p.paperId === paperId);
  const groupedPapers = (subjectId: number) => papers.filter(p => p.subjectId === subjectId);

  function openEdit(student: Student, paper: Paper) {
    const current = getProgress(student.id, paper.id);
    setEdit({ student, paper, current });
    setEditStatus((current?.status as Status) || "In Progress");
    setEditRemark(current?.remark || "");
  }

  async function saveProgress() {
    if (!edit) return;
    setSaving(true);
    try {
      if (!editStatus) {
        await api(`/api/progress?studentId=${edit.student.id}&paperId=${edit.paper.id}`, { method: "DELETE" });
        setProgress(old => old.filter(p => !(p.studentId === edit.student.id && p.paperId === edit.paper.id)));
      } else {
        const saved = await api<Progress>("/api/progress", {
          method: "PUT", body: JSON.stringify({
            studentId: edit.student.id, paperId: edit.paper.id,
            status: editStatus, remark: editRemark
          })
        });
        setProgress(old => [...old.filter(p => !(p.studentId === saved.studentId && p.paperId === saved.paperId)), saved]);
      }
      setEdit(null); setNotice("Progress saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save progress."); }
    finally { setSaving(false); }
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudent.trim()) return;
    try {
      await api("/api/students", { method: "POST", body: JSON.stringify({ name: newStudent.trim() }) });
      setNewStudent(""); await refresh(); setNotice("Student added.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add student."); }
  }

  async function deleteStudent(student: Student) {
    if (!confirm(`Delete ${student.name} and all their progress records?`)) return;
    try { await api(`/api/students?id=${student.id}`, { method: "DELETE" }); await refresh(); setNotice("Student deleted."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete student."); }
  }

  async function addPaper(e: React.FormEvent) {
    e.preventDefault();
    if (!newPaper.trim() || paperSubject === "") return;
    try {
      await api("/api/papers", { method: "POST", body: JSON.stringify({ name: newPaper.trim(), subjectId: paperSubject }) });
      setNewPaper(""); await refresh(); setNotice("Paper added.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add paper."); }
  }

  async function deletePaper(paper: Paper) {
    if (!confirm(`Delete "${paper.name}" and all progress records for it?`)) return;
    try { await api(`/api/papers?id=${paper.id}`, { method: "DELETE" }); await refresh(); setNotice("Paper deleted."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete paper."); }
  }

  function exportCsv() {
    const rows = [["Student", "Subject", "Paper", "Status", "Remark", "Last updated"]];
    for (const student of students) for (const paper of papers) {
      const p = getProgress(student.id, paper.id);
      rows.push([student.name, paper.subjectName || subjects.find(s => s.id === paper.subjectId)?.name || "", paper.name, p?.status || "Not Started", p?.remark || "", p?.updatedAt || ""]);
    }
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "class-10-progress.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function go(next: View) { setSearch(""); setView(next); }
  function back() {
    if (view === "student") go("student-list");
    else if (view === "subject") go("subject-list");
    else go("home");
  }

  const pageTitle = view === "student" ? selectedStudent?.name : view === "subject" ? selectedSubject?.name : view === "manage" ? "Manage records" : "Class 10 Tracker";

  function StatusCell({ student, paper }: { student: Student; paper: Paper }) {
    const item = getProgress(student.id, paper.id);
    return <button className={`status-cell ${item?.status ? statusClass(item.status) : "empty"}`} onClick={() => openEdit(student, paper)} title={item?.remark || "Click to update"}>
      {item?.status ? <><span className="status-dot" />{item.status === "Completed" ? "Done" : item.status === "In Progress" ? "Started" : "Review"}</> : <span className="empty-mark">—</span>}
      {item?.remark && <span className="remark-indicator" title="Has remark">•</span>}
    </button>;
  }

  function StudentMatrix() {
    if (!selectedStudent) return null;
    return <div className="subject-matrices">
      {subjects.map(subject => {
        const subjectPaperList = groupedPapers(subject.id);
        const done = subjectPaperList.filter(p => getProgress(selectedStudent.id, p.id)?.status === "Completed").length;
        return <section className="matrix-section" key={subject.id}>
          <div className="matrix-heading"><div><h3>{subject.name}</h3><span>{done} of {subjectPaperList.length} completed</span></div><span className="mini-count">{subjectPaperList.length} papers</span></div>
          {subjectPaperList.length ? <div className="table-scroll"><table className="progress-table"><thead><tr><th className="sticky-col">Paper</th><th>Status</th><th>Remark</th></tr></thead><tbody>
            {subjectPaperList.map(paper => {
              const item = getProgress(selectedStudent.id, paper.id);
              return <tr key={paper.id}><th className="sticky-col paper-name">{paper.name}</th><td><StatusCell student={selectedStudent} paper={paper} /></td><td className="remark-text">{item?.remark || <span className="muted">—</span>}</td></tr>;
            })}
          </tbody></table></div> : <p className="empty-state compact">No papers added to this subject yet.</p>}
        </section>;
      })}
    </div>;
  }

  function SubjectMatrix() {
    if (!selectedSubject) return null;
    return <div className="table-scroll matrix-wide">
      <table className="progress-table wide-table">
        <thead><tr><th className="sticky-col student-col">Student</th>{subjectPapers.map(p => <th key={p.id} className="paper-col"><span>{p.name}</span></th>)}</tr></thead>
        <tbody>{students.map(student => <tr key={student.id}>
          <th className="sticky-col student-col"><button className="student-link" onClick={() => { setSelectedStudent(student); go("student"); }}>{student.name}</button></th>
          {subjectPapers.map(paper => <td key={paper.id}><StatusCell student={student} paper={paper} /></td>)}
        </tr>)}</tbody>
      </table>
      {!students.length && <p className="empty-state">Add students in Manage records to start tracking.</p>}
      {!subjectPapers.length && <p className="empty-state">No papers added to this subject yet.</p>}
    </div>;
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go("home")}><span className="brand-icon"><GraduationCap size={21} /></span><span><strong>Class 10 Tracker</strong><small>Board Exam Progress</small></span></button>
      <div className="top-actions"><button className="icon-button" onClick={exportCsv} title="Export CSV"><Download size={18}/></button><button className="manage-button" onClick={() => go("manage")}><Settings2 size={16}/> Manage</button></div>
    </header>

    <main className="main-content">
      {view !== "home" && <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>}
      <div className="page-heading"><div><p className="eyebrow">{view === "home" ? "ACADEMY · CLASS 10" : view.includes("student") ? "STUDENT PROGRESS" : view.includes("subject") ? "SUBJECT PROGRESS" : "ADMINISTRATION"}</p><h1>{pageTitle}</h1><p className="subheading">{view === "home" ? "Choose how you want to review progress." : view === "student-list" ? "Search and select a student to view all subjects." : view === "subject-list" ? "Choose a subject to compare all students." : view === "student" ? "Progress across all nine subjects. Select any paper to update it." : view === "subject" ? "Each row is a student; each column is a paper." : "Add students and manage papers for each subject."}</p></div></div>

      {error && <div className="alert error"><CircleHelp size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
      {notice && <div className="alert success"><Check size={17}/>{notice}</div>}
      {loading ? <div className="loading"><span className="spinner"/>Loading your tracker…</div> : <>
        {view === "home" && <div className="home-grid">
          <button className="home-card" onClick={() => go("student-list")}><span className="home-card-icon lavender"><Users size={25}/></span><span className="home-card-copy"><strong>Track by Student</strong><small>View one student's progress across all subjects.</small></span><ChevronRight className="card-arrow"/></button>
          <button className="home-card" onClick={() => go("subject-list")}><span className="home-card-icon mint"><BookOpen size={25}/></span><span className="home-card-copy"><strong>Track by Subject</strong><small>Compare all students in a selected subject.</small></span><ChevronRight className="card-arrow"/></button>
          <div className="quick-stats"><div><span>Students</span><strong>{students.length}</strong></div><div><span>Subjects</span><strong>{subjects.length}</strong></div><div><span>Papers</span><strong>{papers.length}</strong></div></div>
          {!students.length && <div className="empty-state">Start by adding your students in <button className="inline-link" onClick={() => go("manage")}>Manage records</button>.</div>}
        </div>}

        {(view === "student-list" || view === "subject-list") && <div className="selection-panel">
          {view === "student-list" ? <><div className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name…" autoFocus/><span>{filteredStudents.length} students</span></div>
            <div className="selection-list">{filteredStudents.map(student => <button className="selection-row" key={student.id} onClick={() => { setSelectedStudent(student); go("student"); }}><span className="avatar">{student.name.charAt(0).toUpperCase()}</span><span className="selection-name">{student.name}</span><ChevronRight size={18}/></button>)}
            {!filteredStudents.length && <p className="empty-state">No students found. Add students in Manage records.</p>}</div></> :
            <div className="subject-grid">{subjects.map((subject, i) => <button className="subject-choice" key={subject.id} onClick={() => { setSelectedSubject(subject); go("subject"); }}><span className="subject-number">{String(i + 1).padStart(2, "0")}</span><strong>{subject.name}</strong><span>{groupedPapers(subject.id).length} papers</span><ChevronRight size={17}/></button>)}</div>}
        </div>}

        {view === "student" && selectedStudent && <><div className="view-toolbar"><span className="legend"><i className="legend-dot done"/> Completed <i className="legend-dot started"/> In progress <i className="legend-dot review"/> Needs improvement</span><button className="text-button" onClick={exportCsv}><Download size={15}/> Export CSV</button></div><StudentMatrix/></>}
        {view === "subject" && selectedSubject && <><div className="view-toolbar"><span className="legend"><i className="legend-dot done"/> Completed <i className="legend-dot started"/> In progress <i className="legend-dot review"/> Needs improvement</span><span className="muted small">{students.length} students · {subjectPapers.length} papers</span></div><SubjectMatrix/></>}

        {view === "manage" && <div className="manage-layout">
          <section className="manage-card"><div className="manage-card-heading"><div><h2>Students</h2><p>Add or remove students from your tracker.</p></div><span className="count-pill">{students.length}</span></div>
            <form className="inline-form" onSubmit={addStudent}><input value={newStudent} onChange={e => setNewStudent(e.target.value)} placeholder="Enter student name" maxLength={100}/><button className="primary-button" type="submit" disabled={!newStudent.trim()}><Plus size={16}/> Add</button></form>
            <div className="manage-list">{students.map(student => <div className="manage-row" key={student.id}><span className="avatar small-avatar">{student.name[0].toUpperCase()}</span><span>{student.name}</span><button className="danger-icon" onClick={() => deleteStudent(student)} title="Delete student"><Trash2 size={16}/></button></div>)}{!students.length && <p className="muted small">No students added yet.</p>}</div>
          </section>
          <section className="manage-card"><div className="manage-card-heading"><div><h2>Papers</h2><p>Add papers whenever you receive new ones.</p></div><span className="count-pill">{papers.length}</span></div>
            <form className="stack-form" onSubmit={addPaper}><label>Subject<select value={paperSubject} onChange={e => setPaperSubject(Number(e.target.value))}>{subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Paper name<input value={newPaper} onChange={e => setNewPaper(e.target.value)} placeholder="e.g. March 2026 Board Paper" maxLength={120}/></label><button className="primary-button" type="submit" disabled={!newPaper.trim() || paperSubject === ""}><Plus size={16}/> Add paper</button></form>
            <div className="paper-manage-list">{subjects.map(subject => <div className="paper-group" key={subject.id}><strong>{subject.name}</strong>{papers.filter(p => p.subjectId === subject.id).map(paper => <div className="paper-manage-row" key={paper.id}><span>{paper.name}</span><button className="danger-icon" onClick={() => deletePaper(paper)} title="Delete paper"><Trash2 size={15}/></button></div>)}{!papers.some(p => p.subjectId === subject.id) && <span className="muted tiny">No papers yet</span>}</div>)}</div>
          </section>
          <div className="data-note"><CircleHelp size={17}/><span>Deleting a student or paper also deletes its associated progress records. Export a CSV backup before making bulk changes.</span></div>
        </div>}
      </>}
    </main>

    <footer><span>Class 10 Progress Tracker</span><span>Records saved to your database</span></footer>

    {edit && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEdit(null); }}><div className="edit-modal">
      <div className="modal-heading"><div><p className="eyebrow">UPDATE PAPER PROGRESS</p><h2>{edit.paper.name}</h2><p>{edit.student.name} · {subjects.find(s => s.id === edit.paper.subjectId)?.name}</p></div><button className="icon-button" onClick={() => setEdit(null)}><X size={19}/></button></div>
      <label className="field-label">Status</label><div className="status-options">{statusOptions.map(option => <button key={option || "blank"} className={`status-option ${editStatus === option ? "selected" : ""}`} onClick={() => setEditStatus(option)}><span className={`option-dot ${option ? statusClass(option) : ""}`}/>{option || "Not started (blank)"}{editStatus === option && <Check size={16}/>}</button>)}</div>
      <label className="field-label" htmlFor="remark">Teacher's remark <span className="muted">(optional)</span></label><textarea id="remark" value={editRemark} onChange={e => setEditRemark(e.target.value)} placeholder="Add an observation about this paper…" rows={3} maxLength={1000}/>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setEdit(null)}>Cancel</button><button className="primary-button" onClick={saveProgress} disabled={saving}>{saving ? "Saving…" : "Save progress"}</button></div>
      <p className="modal-hint">Choose “Not started (blank)” to clear the status and remark.</p>
    </div></div>}
  </div>;
}

function statusClass(status: string) {
  if (status === "Completed") return "done";
  if (status === "In Progress") return "started";
  return "review";
}

export default App;
