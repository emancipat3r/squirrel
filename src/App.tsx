import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Entry,
  type Task,
  getTodayEntries,
  addEntry,
  clearToday,
  getActiveTask,
  setActiveTask,
  clearActiveTask,
  formatTimestamp,
  exportToday,
} from "./db";

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTask, setActiveTaskState] = useState<Task | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [editingPin, setEditingPin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [todayEntries, task] = await Promise.all([
      getTodayEntries(),
      getActiveTask(),
    ]);
    setEntries(todayEntries);
    setActiveTaskState(task ?? null);
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

  return (
    <div className="app">
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
        </div>
      </header>

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
            onBlur={() => { setPinInput(""); setEditingPin(false); }}
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
          <div className="empty">No entries yet today. Start journaling!</div>
        )}
      </div>
    </div>
  );
}

export default App;
