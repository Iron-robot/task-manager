import { nextStatus, STATUSES } from "../constants.js";

function formatDue(dateStr) {
  if (!dateStr) return null;
  // Parse "YYYY-MM-DD" as a local date (new Date("2026-10-13") would be UTC midnight).
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  const label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (days < 0) return { label: `Overdue since ${label}`, overdue: true };
  if (days === 0) return { label: "Due today", soon: true };
  if (days === 1) return { label: "Due tomorrow", soon: true };
  return { label: `Due ${label}` };
}

export default function TaskRow({ task, busy, onEdit, onDelete, onStatusChange }) {
  const due = task.status !== "done" ? formatDue(task.due_date) : null;
  const statusLabel = STATUSES.find((s) => s.value === task.status)?.label;
  const next = STATUSES.find((s) => s.value === nextStatus(task.status))?.label;

  return (
    <li className={`task status-${task.status}`} aria-busy={busy}>
      <button
        className="status-toggle"
        onClick={() => onStatusChange(task, nextStatus(task.status))}
        disabled={busy}
        title={`Mark as ${next}`}
        aria-label={`${statusLabel}. Mark as ${next}`}
      >
        <span className="status-dot" aria-hidden="true" />
        {statusLabel}
      </button>

      <div className="task-body">
        <h3 className="task-title">{task.title}</h3>
        {task.description && <p className="task-desc">{task.description}</p>}
        <p className="task-meta">
          <span className={`priority priority-${task.priority}`}>{task.priority_display} priority</span>
          {due && (
            <span className={due.overdue ? "due overdue" : due.soon ? "due soon" : "due"}>{due.label}</span>
          )}
        </p>
      </div>

      <div className="task-actions">
        <button className="btn btn-quiet" onClick={() => onEdit(task)} disabled={busy}>Edit</button>
        <button className="btn btn-quiet btn-danger" onClick={() => onDelete(task)} disabled={busy}>Delete</button>
      </div>
    </li>
  );
}
