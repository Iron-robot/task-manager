// Must match the choices in backend/tasks/models.py
export const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/** Clicking a task's status moves it to the next one: To do → In progress → Done → To do. */
export function nextStatus(status) {
  const i = STATUSES.findIndex((s) => s.value === status);
  return STATUSES[(i + 1) % STATUSES.length].value;
}
