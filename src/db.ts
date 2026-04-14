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

const db = new Dexie("squirrel") as Dexie & {
  entries: EntityTable<Entry, "id">;
  tasks: EntityTable<Task, "id">;
};

db.version(1).stores({
  entries: "id, timestamp, taskId",
  tasks: "id, startedAt",
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

export function formatTimestamp(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${month}/${day}/${year}`,
    time: `${hours}${minutes}`,
  };
}

export function exportToday(entries: Entry[]): string {
  // entries should be in chronological order for export
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  return sorted
    .map((e) => {
      const { date, time } = formatTimestamp(e.timestamp);
      const lines = e.text.split("\n");
      const first = `${date}\t${time}\t${lines[0]}`;
      if (lines.length === 1) return first;
      const rest = lines.slice(1).map((l) => `\t\t${l}`);
      return [first, ...rest].join("\n");
    })
    .join("\n");
}
