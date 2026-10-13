import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { createTask, deleteTask, listTasks, updateTask } from "../api/tasks.js";
import ErrorMessage from "../components/ErrorMessage.jsx";
import TaskForm from "../components/TaskForm.jsx";
import TaskRow from "../components/TaskRow.jsx";
import { STATUSES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";

const PAGE_SIZE = 10; // matches REST_FRAMEWORK["PAGE_SIZE"] in Django settings
const FILTERS = [{ value: "", label: "All" }, ...STATUSES];

/** Wait until the user stops typing before searching, instead of one request per keystroke. */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function TasksPage() {
  const { user, logout } = useAuth();

  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null); // task currently being updated/deleted

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listTasks({ page, status, search });
      // Deleting the last task on a page leaves it empty: step back a page.
      if (result.results.length === 0 && page > 1) {
        setPage((p) => p - 1);
        return;
      }
      setData(result);
    } catch (err) {
      // An out-of-range page (e.g. after filtering) returns 404 → go to page 1.
      if (err.response?.status === 404 && page > 1) setPage(1);
      else setError(getErrorMessage(err, "Couldn't load your tasks."));
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  // A new filter or search starts again from page 1.
  function changeStatus(value) {
    setStatus(value);
    setPage(1);
  }

  function changeSearch(value) {
    setSearchInput(value);
    setPage(1);
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task) {
    setEditing(task);
    setFormOpen(true);
  }

  async function handleSave(values) {
    if (editing) await updateTask(editing.id, values);
    else await createTask(values);
    setFormOpen(false);
    await load();
  }

  async function handleStatusChange(task, newStatus) {
    setBusyId(task.id);
    setError("");
    try {
      const updated = await updateTask(task.id, { status: newStatus });
      // If a status filter is active, the task may no longer belong in this view.
      if (status && updated.status !== status) await load();
      else setData((d) => ({ ...d, results: d.results.map((t) => (t.id === updated.id ? updated : t)) }));
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't update the task."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setBusyId(task.id);
    setError("");
    try {
      await deleteTask(task.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete the task."));
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const filtered = Boolean(status || search);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Tasks
        </div>
        <div className="topbar-user">
          <span className="muted">Signed in as {user.username}</span>
          <button className="btn btn-quiet" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="tasks">
        <div className="tasks-head">
          <h1>Your tasks</h1>
          <button className="btn btn-primary" onClick={openNew}>New task</button>
        </div>

        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value || "all"}
                className={status === f.value ? "active" : ""}
                aria-pressed={status === f.value}
                onClick={() => changeStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="search"
            placeholder="Search by title"
            aria-label="Search tasks by title"
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </div>

        <ErrorMessage message={error} />

        {loading && data.results.length === 0 ? (
          <p className="page-status">Loading tasks…</p>
        ) : data.results.length === 0 && !error ? (
          <div className="empty">
            {filtered ? (
              <>
                <p>No tasks match these filters.</p>
                <button className="btn" onClick={() => { changeStatus(""); changeSearch(""); }}>Clear filters</button>
              </>
            ) : (
              <>
                <p>Nothing here yet. Add the first thing you need to get done.</p>
                <button className="btn btn-primary" onClick={openNew}>Add a task</button>
              </>
            )}
          </div>
        ) : (
          <ul className={`task-list ${loading ? "is-loading" : ""}`} aria-busy={loading}>
            {data.results.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={busyId === task.id}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </ul>
        )}

        {data.count > PAGE_SIZE && (
          <nav className="pager" aria-label="Pages">
            <button className="btn" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>
              Previous
            </button>
            <span className="muted">
              Page {page} of {totalPages} ({data.count} tasks)
            </span>
            <button className="btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || loading}>
              Next
            </button>
          </nav>
        )}
      </main>

      <TaskForm open={formOpen} task={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
    </div>
  );
}
