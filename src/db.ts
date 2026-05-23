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

export type TodoStatus = "pending" | "started" | "done";

export type Note = {
  id: string;
  text: string;
  type: "thought" | "question" | "todo";
  timestamp: number;
  flagged: boolean;
  order: number;
  completed: boolean;
  status?: TodoStatus;
  parentId: string | null;
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

db.version(4).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
  notes: "id, type, timestamp, order",
}).upgrade((tx) => {
  return tx.table("notes").toCollection().modify((note) => {
    if (note.completed === undefined) note.completed = false;
  });
});

db.version(5).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
  notes: "id, type, timestamp, order",
}).upgrade((tx) => {
  return tx.table("notes").toCollection().modify((note) => {
    if (note.type === "todo" && note.status === undefined) {
      note.status = note.completed ? "done" : "pending";
    }
  });
});

db.version(6).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
  notes: "id, type, timestamp, order, parentId",
}).upgrade((tx) => {
  return tx.table("notes").toCollection().modify((note) => {
    if (note.parentId === undefined) note.parentId = null;
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
  type: "thought" | "question" | "todo"
): Promise<Note[]> {
  const notes = await db.notes
    .where("type")
    .equals(type)
    .sortBy("order");
  const active = notes.filter((n) => !n.completed);
  // Todos preserve tree structure (no flag floating); thoughts/questions float flagged to top.
  if (type === "todo") return active;
  const flagged = active.filter((n) => n.flagged);
  const unflagged = active.filter((n) => !n.flagged);
  return [...flagged, ...unflagged];
}

export async function getCompletedNotes(
  type: "thought" | "question" | "todo"
): Promise<Note[]> {
  const notes = await db.notes
    .where("type")
    .equals(type)
    .sortBy("order");
  return notes.filter((n) => n.completed);
}

export async function addNote(
  text: string,
  type: "thought" | "question" | "todo",
  parentId: string | null = null
): Promise<Note> {
  // For todos, order is per-parent (siblings only); for others, parentId is always null.
  const siblings = await db.notes
    .where("type")
    .equals(type)
    .filter((n) => (n.parentId ?? null) === parentId)
    .toArray();
  const maxOrder = siblings.reduce((m, n) => Math.max(m, n.order ?? 0), 0);
  const note: Note = {
    id: crypto.randomUUID(),
    text: text.trim(),
    type,
    timestamp: Date.now(),
    flagged: false,
    completed: false,
    order: maxOrder + 1,
    parentId: type === "todo" ? parentId : null,
    ...(type === "todo" ? { status: "pending" as const } : {}),
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

async function collectDescendantIds(rootId: string): Promise<string[]> {
  const all = await db.notes.where("type").equals("todo").toArray();
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of all) {
      if (n.parentId === cur) {
        result.push(n.id);
        stack.push(n.id);
      }
    }
  }
  return result;
}

export async function toggleNoteComplete(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (!note) return;
  if (note.type === "todo") {
    // Cycle: pending → started → done (archive); from archive → pending (restore).
    // Archiving / restoring a parent cascades to all descendants.
    if (note.completed) {
      const descendants = await collectDescendantIds(id);
      await db.transaction("rw", db.notes, async () => {
        await db.notes.update(id, { status: "pending", completed: false });
        for (const did of descendants) {
          await db.notes.update(did, { completed: false });
        }
      });
      return;
    }
    const current = note.status ?? "pending";
    if (current === "pending") {
      await db.notes.update(id, { status: "started" });
    } else if (current === "started") {
      const descendants = await collectDescendantIds(id);
      await db.transaction("rw", db.notes, async () => {
        await db.notes.update(id, { status: "done", completed: true, flagged: false });
        for (const did of descendants) {
          await db.notes.update(did, { completed: true });
        }
      });
    } else {
      await db.notes.update(id, { status: "pending" });
    }
    return;
  }
  await db.notes.update(id, { completed: !note.completed, flagged: false });
}

export async function reorderNotes(orderedIds: string[]): Promise<void> {
  await db.transaction("rw", db.notes, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.notes.update(orderedIds[i], { order: i });
    }
  });
}

/** Move a todo to a new parent and/or position relative to a target note. */
export async function moveNote(
  dragId: string,
  targetId: string,
  position: "above" | "below" | "child"
): Promise<void> {
  if (dragId === targetId) return;
  const drag = await db.notes.get(dragId);
  const target = await db.notes.get(targetId);
  if (!drag || !target) return;
  if (drag.type !== "todo" || target.type !== "todo") return;

  // Cycle check: target must not be a descendant of drag
  const dragDescendants = new Set(await collectDescendantIds(dragId));
  if (dragDescendants.has(targetId)) return;

  const newParent =
    position === "child" ? targetId : target.parentId ?? null;

  // Fractional insert order, then normalize siblings to 0..n-1
  let tempOrder: number;
  if (position === "child") {
    const children = await db.notes
      .where("type")
      .equals("todo")
      .filter((n) => n.parentId === targetId && n.id !== dragId)
      .toArray();
    const maxOrder = children.reduce((m, n) => Math.max(m, n.order ?? 0), 0);
    tempOrder = maxOrder + 1;
  } else {
    tempOrder = target.order + (position === "above" ? -0.5 : 0.5);
  }

  await db.transaction("rw", db.notes, async () => {
    await db.notes.update(dragId, { parentId: newParent, order: tempOrder });
    // Normalize sibling orders in the destination group
    const siblings = await db.notes
      .where("type")
      .equals("todo")
      .filter((n) => (n.parentId ?? null) === newParent)
      .toArray();
    siblings.sort((a, b) => a.order - b.order);
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].order !== i) {
        await db.notes.update(siblings[i].id, { order: i });
      }
    }
  });
}

export async function deleteNote(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (note?.type === "todo") {
    const descendants = await collectDescendantIds(id);
    await db.notes.bulkDelete([id, ...descendants]);
    return;
  }
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
