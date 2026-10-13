import api from "./client.js";

/** params: { page, status, search, ordering } — empty values are dropped. */
export async function listTasks(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  const { data } = await api.get("/tasks/", { params: clean });
  return data; // { count, next, previous, results }
}

export async function createTask(task) {
  const { data } = await api.post("/tasks/", task);
  return data;
}

export async function updateTask(id, changes) {
  const { data } = await api.patch(`/tasks/${id}/`, changes);
  return data;
}

export async function deleteTask(id) {
  await api.delete(`/tasks/${id}/`);
}
