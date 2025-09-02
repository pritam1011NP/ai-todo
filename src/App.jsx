import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, CheckSquare, SquarePen, X, Check, Search, Filter, ListChecks, CalendarClock } from "lucide-react";

// --- Utilities ---
const uid = () => Math.random().toString(36).slice(2, 9);
const todayIso = () => new Date().toISOString().slice(0, 10);

const FILTERS = {
  all: () => true,
  active: (t) => !t.done,
  done: (t) => t.done,
  today: (t) => t.due === todayIso() && !t.done,
};

const prettyCount = (n) => (n === 0 ? "nothing (woot!)" : `${n} ${n === 1 ? "task" : "tasks"}`);

// --- Persist Hook ---
function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// --- Chip Button ---
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm border transition-all ${
        active
          ? "bg-black text-white border-black shadow"
          : "bg-white text-gray-700 border-gray-200 hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

// --- Editable Text ---
function Editable({ text, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => setValue(text), [text]);

  const save = () => {
    const v = value.trim();
    if (v && v !== text) onSave(v);
    setEditing(false);
  };

  if (!editing)
    return (
      <button
        className="text-left w-full hover:underline decoration-dotted decoration-1"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {text}
      </button>
    );

  return (
    <div className="flex gap-2 items-center">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(text);
            setEditing(false);
          }
        }}
        className="flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-black"
      />
      <button onClick={save} className="p-2 rounded-xl border hover:bg-gray-50" title="Save">
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          setValue(text);
          setEditing(false);
        }}
        className="p-2 rounded-xl border hover:bg-gray-50"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Task Row ---
function TaskRow({ task, onToggle, onDelete, onRename, onSetDue }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`group grid grid-cols-[auto,1fr,auto,auto] items-center gap-3 px-3 py-2 rounded-2xl border ${
        task.done ? "bg-gray-50" : "bg-white"
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
          task.done ? "bg-black border-black" : "bg-white"
        }`}
        title={task.done ? "Mark as not done" : "Mark as done"}
      >
        {task.done ? (
          <CheckSquare className="w-4 h-4 text-white" />
        ) : (
          <span className="block w-3 h-3 rounded-sm" />
        )}
      </button>

      <div className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>
        <Editable text={task.title} onSave={onRename} />
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5" />
          <input
            type="date"
            value={task.due || ""}
            onChange={(e) => onSetDue(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs"
          />
          {task.due && (
            <span className="ml-1">
              {new Date(task.due).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="justify-self-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onToggle}
          className="px-2 py-1 text-xs rounded-xl border hover:bg-gray-50"
        >
          {task.done ? "Undo" : "Done"}
        </button>
      </div>

      <button
        onClick={onDelete}
        className="justify-self-end p-2 rounded-xl border hover:bg-red-50"
        title="Delete task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.li>
  );
}

// --- Main App ---
export default function App() {
  const [tasks, setTasks] = useLocalStorage("ai-todo/tasks", [
    { id: uid(), title: "Ship this slick to‑do app", done: false, due: todayIso() },
    { id: uid(), title: "Study 30 mins", done: false, due: todayIso() },
  ]);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const base = tasks.filter(FILTERS[filter]);
    const q = query.trim().toLowerCase();
    return q ? base.filter((t) => t.title.toLowerCase().includes(q)) : base;
  }, [tasks, filter, query]);

  const addTask = () => {
    const title = input.trim();
    if (!title) return;
    setTasks([{ id: uid(), title, done: false, due: null }, ...tasks]);
    setInput("");
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    return { total, done, left: total - done };
  }, [tasks]);

  const bulkClearDone = () => setTasks(tasks.filter((t) => !t.done));
  const markAll = (done) => setTasks(tasks.map((t) => ({ ...t, done })));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-black text-white shadow">
            <ListChecks className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your AI‑grade To‑Do</h1>
            <p className="text-sm text-gray-600">Focus mode, filters, instant save. Zero fluff.</p>
          </div>
        </div>

        {/* Composer */}
        <div className="grid grid-cols-[1fr_auto] gap-2 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Type a task and hit Enter…"
            className="px-4 py-3 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={addTask}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border bg-black text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
          <div className="flex items-center gap-2">
            {Object.keys(FILTERS).map((k) => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="pl-9 pr-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => markAll(true)}
                className="px-3 py-2 rounded-2xl border hover:bg-gray-50"
                title="Mark all done"
              >
                Finish all
              </button>
              <button
                onClick={() => markAll(false)}
                className="px-3 py-2 rounded-2xl border hover:bg-gray-50"
                title="Mark all not done"
              >
                Reset all
              </button>
              <button
                onClick={bulkClearDone}
                className="px-3 py-2 rounded-2xl border hover:bg-gray-50"
                title="Clear completed"
              >
                Clear done
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="rounded-3xl border bg-white p-3 shadow-sm">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center text-gray-500"
              >
                <Filter className="w-5 h-5 mx-auto mb-2" /> Nothing here — add a task!
              </motion.div>
            ) : (
              <motion.ul layout className="space-y-2">
                {filtered.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() =>
                      setTasks(
                        tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                      )
                    }
                    onDelete={() => setTasks(tasks.filter((x) => x.id !== t.id))}
                    onRename={(title) =>
                      setTasks(tasks.map((x) => (x.id === t.id ? { ...x, title } : x)))
                    }
                    onSetDue={(due) =>
                      setTasks(tasks.map((x) => (x.id === t.id ? { ...x, due } : x)))
                    }
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-4 text-sm text-gray-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            You have <strong>{prettyCount(stats.left)}</strong> left out of {stats.total}.
          </span>
          <span className="opacity-70">
            Auto‑saves locally • Tip: press <kbd className="px-1 border rounded">Enter</kbd> to add
          </span>
        </div>
      </div>
    </div>
  );
}
