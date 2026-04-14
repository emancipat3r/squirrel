import Dexie, { type EntityTable } from "dexie";

export type Entry = {
  id: string;
  timestamp: number;
  text: string;
  taskId: string | null;
};

export type Task = {
  id: string;
  label: string;
  startedAt: number;
  endedAt: number | null;
};

export type Note = {
  id: string;
  text: string;
  type: "thought" | "question";
  timestamp: number;
  flagged: boolean;
  order: number;
};

const db = new Dexie("squirrel") as Dexie & {
  entries: EntityTable<Entry, "id">;
  tasks: EntityTable<Task, "id">;
  notes: EntityTable<Note, "id">;
};

db.version(1).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
});

db.version(2).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
  notes: "id, type, timestamp",
});

db.version(3).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
  notes: "id, type, timestamp, order",
}).upgrade((tx) => {
  return tx.table("notes").toCollection().modify((note) => {
    if (note.flagged === undefined) note.flagged = false;
    if (note.order === undefined) note.order = note.timestamp;
  });
});

export { db };

// Helpers

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function getTodayEntries(): Promise<Entry[]> {
  const arr = await db.entries
    .where("timestamp")
    .aboveOrEqual(startOfToday())
    .toArray();
  return arr.sort((a, b) => b.timestamp - a.timestamp);
}

export async function addEntry(
  text: string,
  taskId: string | null
): Promise<Entry> {
  const entry: Entry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    text: text.trim(),
    taskId,
  };
  await db.entries.add(entry);
  return entry;
}

export async function clearToday(): Promise<void> {
  const keys = await db.entries
    .where("timestamp")
    .aboveOrEqual(startOfToday())
    .primaryKeys();
  await db.entries.bulkDelete(keys);
}

export async function getActiveTask(): Promise<Task | undefined> {
  return db.tasks.filter((t) => t.endedAt === null).first();
}

export async function setActiveTask(label: string): Promise<Task> {
  // End any current active task
  const active = await getActiveTask();
  if (active) {
    await db.tasks.update(active.id, { endedAt: Date.now() });
  }
  const task: Task = {
    id: crypto.randomUUID(),
    label,
    startedAt: Date.now(),
    endedAt: null,
  };
  await db.tasks.add(task);
  return task;
}

export async function clearActiveTask(): Promise<void> {
  const active = await getActiveTask();
  if (active) {
    await db.tasks.update(active.id, { endedAt: Date.now() });
  }
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${hours}${minutes}`;
}

// Notes (parking lot)

export async function getNotes(
  type: "thought" | "question"
): Promise<Note[]> {
  const notes = await db.notes
    .where("type")
    .equals(type)
    .sortBy("order");
  // Flagged items float to top, preserve relative order within each group
  const flagged = notes.filter((n) => n.flagged);
  const unflagged = notes.filter((n) => !n.flagged);
  return [...flagged, ...unflagged];
}

export async function addNote(
  text: string,
  type: "thought" | "question"
): Promise<Note> {
  const existing = await db.notes.where("type").equals(type).toArray();
  const maxOrder = existing.reduce((m, n) => Math.max(m, n.order ?? 0), 0);
  const note: Note = {
    id: crypto.randomUUID(),
    text: text.trim(),
    type,
    timestamp: Date.now(),
    flagged: false,
    order: maxOrder + 1,
  };
  await db.notes.add(note);
  return note;
}

export async function updateNote(id: string, text: string): Promise<void> {
  await db.notes.update(id, { text });
}

export async function toggleNoteFlag(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (note) {
    await db.notes.update(id, { flagged: !note.flagged });
  }
}

export async function reorderNotes(orderedIds: string[]): Promise<void> {
  await db.transaction("rw", db.notes, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.notes.update(orderedIds[i], { order: i });
    }
  });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

export function exportToday(entries: Entry[]): string {
  // entries should be in chronological order for export
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  return sorted
    .map((e) => {
      const ts = formatTimestamp(e.timestamp);
      const lines = e.text.split("\n");
      const first = `${ts}\t${lines[0]}`;
      if (lines.length === 1) return first;
      const rest = lines.slice(1).map((l) => `\t\t${l}`);
      return [first, ...rest].join("\n");
    })
    .join("\n");
}
