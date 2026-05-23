import { useState, useEffect, useRef, useCallback, Fragment, type ReactNode } from "react";
import {
  type Entry,
  type Task,
  type Note,
  type TodoStatus,
  getTodayEntries,
  addEntry,
  clearToday,
  getActiveTask,
  setActiveTask,
  clearActiveTask,
  formatTimestamp,
  exportToday,
  getNotes,
  getCompletedNotes,
  addNote,
  updateNote,
  deleteNote,
  toggleNoteFlag,
  toggleNoteComplete,
  reorderNotes,
  moveNote,
} from "./db";
import { themes, loadThemeId, saveThemeId, applyTheme } from "./themes";

/* ─── Theme Picker ─── */

function ThemePicker({
  currentId,
  onChange,
}: {
  currentId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="btn btn-secondary theme-picker-toggle"
        onClick={() => setOpen(!open)}
        title="Change theme"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      </button>
      {open && (
        <div className="theme-picker-dropdown">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-picker-option ${
                t.id === currentId ? "theme-picker-option--active" : ""
              }`}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
            >
              <span
                className="theme-picker-swatch"
                style={{
                  background: `linear-gradient(135deg, ${t.vars["--accent"]}, ${t.vars["--secondary"]})`,
                }}
              />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Todo Checkbox (3-state) ─── */

function TodoCheckbox({
  status,
  archived,
  onClick,
}: {
  status: TodoStatus;
  archived?: boolean;
  onClick: () => void;
}) {
  const effective: TodoStatus = archived ? "done" : status;
  const title = archived
    ? "Restore"
    : effective === "pending"
      ? "Mark in progress"
      : effective === "started"
        ? "Mark done"
        : "Reset";
  return (
    <button
      type="button"
      className={`todo-checkbox todo-checkbox--${effective}`}
      onClick={onClick}
      title={title}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="12" height="12" rx="2.5" />
        {effective === "started" && <path d="M3.5 12.5 L12.5 3.5" />}
        {effective === "done" && (
          <>
            <path d="M4 4 L12 12" />
            <path d="M12 4 L4 12" />
          </>
        )}
      </svg>
    </button>
  );
}

/* ─── Note Cell ─── */

type DropPosition = "above" | "below" | "child";

function NoteCell({
  note,
  depth = 0,
  onUpdate,
  onDelete,
  onToggleFlag,
  onComplete,
  onAddSubtask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  dropPosition,
  archived,
}: {
  note: Note;
  depth?: number;
  onUpdate: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleFlag: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onAddSubtask?: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  dropPosition: DropPosition | null;
  archived?: boolean;
}) {
  const isTodo = note.type === "todo";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setValue(note.text);
  }, [note.text]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== note.text) {
      await onUpdate(note.id, trimmed);
    } else {
      setValue(note.text);
    }
    setEditing(false);
  };

  return (
    <div
      className={[
        "note-cell",
        note.flagged ? "note-cell--flagged" : "",
        archived ? "note-cell--completed" : "",
        isDragging ? "note-cell--dragging" : "",
        dropPosition === "above" ? "note-cell--drop-above" : "",
        dropPosition === "below" ? "note-cell--drop-below" : "",
        dropPosition === "child" ? "note-cell--drop-child" : "",
        depth > 0 ? "note-cell--nested" : "",
      ].filter(Boolean).join(" ")}
      style={depth > 0 ? { marginLeft: depth * 22 } : undefined}
      draggable={!editing && !archived}
      onDragStart={(e) => onDragStart(e, note.id)}
      onDragOver={(e) => onDragOver(e, note.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, note.id)}
    >
      {!archived && (
        <div className="note-cell-drag" title="Drag to reorder">
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.2" />
            <circle cx="6" cy="2" r="1.2" />
            <circle cx="2" cy="7" r="1.2" />
            <circle cx="6" cy="7" r="1.2" />
            <circle cx="2" cy="12" r="1.2" />
            <circle cx="6" cy="12" r="1.2" />
          </svg>
        </div>
      )}
      {isTodo && (
        <TodoCheckbox
          status={note.status ?? "pending"}
          archived={archived}
          onClick={() => onComplete(note.id)}
        />
      )}
      {editing ? (
        <textarea
          ref={textareaRef}
          className="note-cell-edit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setValue(note.text);
              setEditing(false);
            }
          }}
          rows={2}
        />
      ) : (
        <div className="note-cell-text" onClick={() => setEditing(true)}>
          {note.text}
        </div>
      )}
      <div className="note-cell-actions">
        {isTodo && !archived && onAddSubtask && (
          <button
            className="note-cell-subtask"
            onClick={() => onAddSubtask(note.id)}
            title="Add subtask"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 2v8M2 6h8" />
            </svg>
          </button>
        )}
        {!archived && (
          <button
            className={`note-cell-flag ${note.flagged ? "note-cell-flag--active" : ""}`}
            onClick={() => onToggleFlag(note.id)}
            title={note.flagged ? "Unflag" : "Flag as important"}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill={note.flagged ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
              <path d="M2 1v10M2 1.5l8 2.5-8 2.5" />
            </svg>
          </button>
        )}
        {!isTodo && (
          <button
            className={`note-cell-check ${archived ? "note-cell-check--done" : ""}`}
            onClick={() => onComplete(note.id)}
            title={archived ? "Restore" : "Mark complete"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {archived
                ? <path d="M3 7h8" />
                : <path d="M3 7l3 3 5-6" />
              }
            </svg>
          </button>
        )}
        <button
          className="note-cell-delete"
          onClick={() => onDelete(note.id)}
          title="Remove"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

/* ─── Tree helpers (todos only) ─── */

type TodoNode = Note & { children: TodoNode[] };

function buildTodoTree(notes: Note[]): TodoNode[] {
  const map = new Map<string, TodoNode>();
  notes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TodoNode[] = [];
  notes.forEach((n) => {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: TodoNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

/* ─── Subtask Input (inline, appears under a parent when "+" is clicked) ─── */

function SubtaskInput({
  depth,
  onSubmit,
  onClose,
}: {
  depth: number;
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = async () => {
    const t = value.trim();
    if (!t) return;
    await onSubmit(t);
    setValue("");
    ref.current?.focus();
  };

  return (
    <div
      className="todo-subtask-input"
      style={{ marginLeft: depth * 22 }}
    >
      <textarea
        ref={ref}
        className="todo-subtask-input-field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
        onBlur={() => {
          if (!value.trim()) onClose();
        }}
        rows={1}
        placeholder="Subtask..."
      />
    </div>
  );
}

/* ─── Parking Lot ─── */

function ParkingLot({
  title,
  type,
  notes,
  completedNotes,
  onAdd,
  onUpdate,
  onDelete,
  onToggleFlag,
  onComplete,
  onReorder,
  onMove,
}: {
  title: string;
  type: "thought" | "question" | "todo";
  notes: Note[];
  completedNotes: Note[];
  onAdd: (
    text: string,
    type: "thought" | "question" | "todo",
    parentId?: string | null
  ) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleFlag: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onMove?: (
    dragId: string,
    targetId: string,
    position: DropPosition
  ) => Promise<void>;
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState<DropPosition | null>(null);
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isTodo = type === "todo";

  const handleAdd = async () => {
    const text = newValue.trim();
    if (!text) return;
    await onAdd(text, type);
    setNewValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragId || dragId === targetId) {
      setDropTargetId(null);
      setDropPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (isTodo) {
      const ratio = y / rect.height;
      const pos: DropPosition =
        ratio < 0.25 ? "above" : ratio < 0.75 ? "child" : "below";
      setDropTargetId(targetId);
      setDropPos(pos);
    } else {
      const midY = rect.height / 2;
      const pos: DropPosition = y < midY ? "above" : "below";
      setDropTargetId(targetId);
      setDropPos(pos);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    setDropPos(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTargetId(null);
    setDropPos(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const currentDropPos = dropPos;
    setDropTargetId(null);
    setDropPos(null);

    if (!dragId || dragId === targetId || !currentDropPos) {
      setDragId(null);
      return;
    }

    if (isTodo && onMove) {
      await onMove(dragId, targetId, currentDropPos);
      setDragId(null);
      return;
    }

    const ids = notes.map((n) => n.id);
    const fromIdx = ids.indexOf(dragId);
    if (fromIdx === -1) {
      setDragId(null);
      return;
    }
    ids.splice(fromIdx, 1);
    const toIdx = ids.indexOf(targetId);
    if (toIdx === -1) {
      setDragId(null);
      return;
    }
    const insertIdx = currentDropPos === "below" ? toIdx + 1 : toIdx;
    ids.splice(insertIdx, 0, dragId);
    await onReorder(ids);
    setDragId(null);
  };

  const handleAddSubtask = (parentId: string) => {
    setAddingSubtaskFor(parentId);
  };

  const renderTodoNode = (
    node: TodoNode,
    depth: number,
    archived: boolean
  ): ReactNode => (
    <Fragment key={node.id}>
      <NoteCell
        note={node}
        depth={depth}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleFlag={onToggleFlag}
        onComplete={onComplete}
        onAddSubtask={archived ? undefined : handleAddSubtask}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        isDragging={dragId === node.id}
        dropPosition={dropTargetId === node.id ? dropPos : null}
        archived={archived}
      />
      {node.children.map((child) => renderTodoNode(child, depth + 1, archived))}
      {!archived && addingSubtaskFor === node.id && (
        <SubtaskInput
          depth={depth + 1}
          onSubmit={async (text) => {
            await onAdd(text, "todo", node.id);
          }}
          onClose={() => setAddingSubtaskFor(null)}
        />
      )}
    </Fragment>
  );

  const flaggedCount = notes.filter((n) => n.flagged).length;
  const todoRoots = isTodo ? buildTodoTree(notes) : [];
  const archivedTodoRoots = isTodo ? buildTodoTree(completedNotes) : [];

  return (
    <div className={`parking-lot parking-lot--${type}`}>
      <div className="parking-lot-header">
        <h2 className="parking-lot-title">{title}</h2>
        <div className="parking-lot-meta">
          {flaggedCount > 0 && (
            <span className="parking-lot-flags" title={`${flaggedCount} flagged`}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" stroke="currentColor" strokeWidth="1">
                <path d="M2 1v10M2 1.5l8 2.5-8 2.5" />
              </svg>
              {flaggedCount}
            </span>
          )}
          <span className="parking-lot-count">{notes.length}</span>
        </div>
      </div>
      <div className="parking-lot-new">
        <textarea
          ref={inputRef}
          className="parking-lot-input"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            type === "thought"
              ? "Park a thought..."
              : type === "question"
                ? "Drop a question..."
                : "Add a to-do..."
          }
          rows={2}
        />
      </div>
      <div className="parking-lot-cells" onDragEnd={handleDragEnd}>
        {isTodo
          ? todoRoots.map((root) => renderTodoNode(root, 0, false))
          : notes.map((note) => (
              <NoteCell
                key={note.id}
                note={note}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleFlag={onToggleFlag}
                onComplete={onComplete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isDragging={dragId === note.id}
                dropPosition={dropTargetId === note.id ? dropPos : null}
              />
            ))}
        {notes.length === 0 && completedNotes.length === 0 && (
          <div className="parking-lot-empty">
            {type === "thought"
              ? "No thoughts parked yet"
              : type === "question"
                ? "No questions yet"
                : "No to-dos yet"}
          </div>
        )}
        {completedNotes.length > 0 && (
          <div className="archive">
            <button
              className="archive-toggle"
              onClick={() => setArchiveOpen(!archiveOpen)}
            >
              <svg
                className={`archive-chevron ${archiveOpen ? "archive-chevron--open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 3l4 3-4 3" />
              </svg>
              Completed ({completedNotes.length})
            </button>
            {archiveOpen && (
              <div className="archive-list">
                {isTodo
                  ? archivedTodoRoots.map((root) =>
                      renderTodoNode(root, 0, true)
                    )
                  : completedNotes.map((note) => (
                      <NoteCell
                        key={note.id}
                        note={note}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onToggleFlag={onToggleFlag}
                        onComplete={onComplete}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        isDragging={false}
                        dropPosition={null}
                        archived
                      />
                    ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── App ─── */

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTask, setActiveTaskState] = useState<Task | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [editingPin, setEditingPin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [thoughts, setThoughts] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Note[]>([]);
  const [completedThoughts, setCompletedThoughts] = useState<Note[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<Note[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Note[]>([]);
  const [themeId, setThemeId] = useState(loadThemeId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Apply theme on mount and change
  useEffect(() => {
    const theme = themes.find((t) => t.id === themeId) ?? themes[0];
    applyTheme(theme);
    saveThemeId(theme.id);
  }, [themeId]);

  const refresh = useCallback(async () => {
    const [todayEntries, task, t, q, td, ct, cq, ctd] = await Promise.all([
      getTodayEntries(),
      getActiveTask(),
      getNotes("thought"),
      getNotes("question"),
      getNotes("todo"),
      getCompletedNotes("thought"),
      getCompletedNotes("question"),
      getCompletedNotes("todo"),
    ]);
    setEntries(todayEntries);
    setActiveTaskState(task ?? null);
    setThoughts(t);
    setQuestions(q);
    setTodos(td);
    setCompletedThoughts(ct);
    setCompletedQuestions(cq);
    setCompletedTodos(ctd);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (editingPin) {
      pinInputRef.current?.focus();
    }
  }, [editingPin]);

  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text) return;
    await addEntry(text, activeTask?.id ?? null);
    setInputValue("");
    await refresh();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePinSubmit = async () => {
    const label = pinInput.trim();
    if (label) {
      await setActiveTask(label);
    } else {
      await clearActiveTask();
    }
    setPinInput("");
    setEditingPin(false);
    await refresh();
    inputRef.current?.focus();
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePinSubmit();
    }
    if (e.key === "Escape") {
      setPinInput("");
      setEditingPin(false);
      inputRef.current?.focus();
    }
  };

  const handleClearPin = async () => {
    await clearActiveTask();
    await refresh();
    inputRef.current?.focus();
  };

  const handleExport = async () => {
    const fresh = await getTodayEntries();
    const text = exportToday(fresh);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearDay = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await clearToday();
    setConfirmClear(false);
    await refresh();
  };

  const handleAddNote = async (
    text: string,
    type: "thought" | "question" | "todo",
    parentId: string | null = null
  ) => {
    await addNote(text, type, parentId);
    await refresh();
  };

  const handleMoveTodo = async (
    dragId: string,
    targetId: string,
    position: "above" | "below" | "child"
  ) => {
    await moveNote(dragId, targetId, position);
    await refresh();
  };

  const handleUpdateNote = async (id: string, text: string) => {
    await updateNote(id, text);
    await refresh();
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    await refresh();
  };

  const handleToggleFlag = async (id: string) => {
    await toggleNoteFlag(id);
    await refresh();
  };

  const handleComplete = async (id: string) => {
    await toggleNoteComplete(id);
    await refresh();
  };

  const handleReorder = async (orderedIds: string[]) => {
    await reorderNotes(orderedIds);
    await refresh();
  };

  return (
    <div className="shell">
      <header className="header">
        <h1 className="title">squirrel</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={entries.length === 0}
          >
            {copied ? "Copied!" : "Export"}
          </button>
          <button
            className={`btn ${confirmClear ? "btn-danger" : "btn-secondary"}`}
            onClick={handleClearDay}
            disabled={entries.length === 0}
          >
            {confirmClear ? "Confirm clear?" : "Clear day"}
          </button>
          <ThemePicker currentId={themeId} onChange={setThemeId} />
        </div>
      </header>

      <ParkingLot
        title="To Do"
        type="todo"
        notes={todos}
        completedNotes={completedTodos}
        onAdd={handleAddNote}
        onUpdate={handleUpdateNote}
        onDelete={handleDeleteNote}
        onToggleFlag={handleToggleFlag}
        onComplete={handleComplete}
        onReorder={handleReorder}
        onMove={handleMoveTodo}
      />

      <div className="columns">
        <ParkingLot
          title="Thoughts"
          type="thought"
          notes={thoughts}
          completedNotes={completedThoughts}
          onAdd={handleAddNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
          onToggleFlag={handleToggleFlag}
          onComplete={handleComplete}
          onReorder={handleReorder}
        />

        <div className="journal">
          <div className="pin">
            <span className="pin-label">Working on:</span>
            {editingPin ? (
              <input
                ref={pinInputRef}
                className="pin-input"
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={handlePinKeyDown}
                onBlur={() => {
                  setPinInput("");
                  setEditingPin(false);
                }}
                placeholder="What are you working on?"
              />
            ) : activeTask ? (
              <div className="pin-value">
                <span
                  className="pin-text"
                  onClick={() => {
                    setPinInput(activeTask.label);
                    setEditingPin(true);
                  }}
                >
                  {activeTask.label}
                </span>
                <button className="btn-clear-pin" onClick={handleClearPin}>
                  &times;
                </button>
              </div>
            ) : (
              <button
                className="btn-set-pin"
                onClick={() => setEditingPin(true)}
              >
                Set task...
              </button>
            )}
          </div>

          <div className="capture">
            <textarea
              ref={inputRef}
              className="capture-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What just happened? (Enter to save, Shift+Enter for newline)"
              rows={2}
            />
          </div>

          <div className="feed">
            {entries.map((entry) => {
              const ts = formatTimestamp(entry.timestamp);
              return (
                <div key={entry.id} className="entry">
                  <span className="entry-ts">{ts}</span>
                  <span className="entry-text">{entry.text}</span>
                </div>
              );
            })}
            {entries.length === 0 && (
              <div className="empty">
                No entries yet today. Start journaling!
              </div>
            )}
          </div>
        </div>

        <ParkingLot
          title="Questions"
          type="question"
          notes={questions}
          completedNotes={completedQuestions}
          onAdd={handleAddNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
          onToggleFlag={handleToggleFlag}
          onComplete={handleComplete}
          onReorder={handleReorder}
        />
      </div>
    </div>
  );
}

export default App;
