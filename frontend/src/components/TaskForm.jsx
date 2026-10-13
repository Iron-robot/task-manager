import { useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { PRIORITIES, STATUSES } from "../constants.js";
import ErrorMessage from "./ErrorMessage.jsx";

const EMPTY = { title: "", description: "", status: "todo", priority: "medium", due_date: "" };

/**
 * Add/edit form shown in a native <dialog>.
 * task = null → create mode; task = {...} → edit mode.
 * onSave(values) must return a promise; errors from it are shown in the form.
 */
export default function TaskForm({ open, task, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(task);

  // Open/close the dialog and reset the fields whenever it opens.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setValues(task ? { ...EMPTY, ...task, due_date: task.due_date || "" } : EMPTY);
      setError("");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, task]);

  const update = (e) => setValues({ ...values, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Give the task a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: values.title.trim(),
        description: values.description,
        status: values.status,
        priority: values.priority,
        due_date: values.due_date || null, // empty input → no due date
      });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save the task. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="task-dialog" onClose={onClose} aria-labelledby="task-form-title">
      <form onSubmit={handleSubmit} className="form" noValidate>
        <h2 id="task-form-title">{isEdit ? "Edit task" : "New task"}</h2>
        <label>
          Title
          <input name="title" value={values.title} onChange={update} maxLength={200} required autoFocus />
        </label>
        <label>
          <span>Description <span className="optional">(optional)</span></span>
          <textarea name="description" value={values.description} onChange={update} rows={3} />
        </label>
        <div className="form-row">
          <label>
            Status
            <select name="status" value={values.status} onChange={update}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" value={values.priority} onChange={update}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label>
            Due date
            <input name="due_date" type="date" value={values.due_date} onChange={update} />
          </label>
        </div>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
