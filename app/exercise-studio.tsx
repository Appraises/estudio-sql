"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import initSqlJs, { type Database } from "sql.js";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert, Database as DatabaseIcon, KeyRound, Link2, Play, RotateCcw, Rows3, Table2, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exercises } from "@/lib/exercises";
import { readSchema, showValue, type QueryResult, type SchemaTable } from "@/lib/sqlite";

const topics = ["SQL básico", "JOIN", "OUTER JOIN", "Agregações"] as const;
const storageKey = "atlas-sql-exercises-v1";
type SavedProgress = { currentId?: string; index?: number; completed: string[]; drafts: Record<string, string> };

function adaptQuery(sql: string) {
  return sql
    .replace(/\bSET\s+search_path\s+TO\s+universidade\s*;/gi, "")
    .replace(/\buniversidade\./gi, "")
    .replace(/\bILIKE\b/gi, "LIKE");
}

export default function ExerciseStudio() {
  const db = useRef<Database | null>(null);
  const source = useRef<string>("");
  const editor = useRef<HTMLTextAreaElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const exercise = exercises[index];
  const query = drafts[exercise.id] ?? "";
  const relevant = useMemo(() => new Set(exercise.tables), [exercise.tables]);
  const relatedTables = schema.filter((table) => relevant.has(table.name));
  const selected = schema.find((table) => table.name === activeTable);
  const relationships = relatedTables.flatMap((table) =>
    table.columns.flatMap((column) =>
      column.references && relevant.has(column.references.table)
        ? [`${table.name}.${column.name} → ${column.references.table}.${column.references.column}`]
        : []
    )
  );
  const percent = Math.round((completed.length / exercises.length) * 100);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as SavedProgress | null;
        if (saved) {
          const position = saved.currentId ? exercises.findIndex((entry) => entry.id === saved.currentId) : (saved.index ?? 0);
          setIndex(Math.min(Math.max(position, 0), exercises.length - 1));
          setCompleted(Array.isArray(saved.completed) ? saved.completed.filter((id) => exercises.some((entry) => entry.id === id)) : []);
          setDrafts(saved.drafts && typeof saved.drafts === "object" ? saved.drafts : {});
        }
      } catch { /* Invalid browser storage is ignored. */ }
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ currentId: exercise.id, completed, drafts })); }
    catch { /* Study still works without storage. */ }
  }, [exercise.id, completed, drafts, hydrated]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      initSqlJs({ locateFile: () => "/sql-wasm.wasm" }),
      fetch("/universidade.sql").then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar a base Universidade.");
        return response.text();
      }),
    ]).then(([SQL, sql]) => {
      if (cancelled) return;
      source.current = sql;
      const next = new SQL.Database();
      next.exec(sql);
      db.current = next;
      setSchema(readSchema(next));
      setReady(true);
    }).catch((cause) => setLoadingError(cause instanceof Error ? cause.message : String(cause)));
    return () => { cancelled = true; db.current?.close(); db.current = null; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setActiveTable(exercise.tables[0] ?? null);
      setResult(null);
      setError(null);
      setNotice(null);
      setDuration(null);
    });
    return () => { active = false; };
  }, [index, ready, exercise.tables]);

  const selectExercise = (next: number) => setIndex(Math.min(Math.max(next, 0), exercises.length - 1));
  const updateDraft = (value: string) => {
    setDrafts((previous) => ({ ...previous, [exercise.id]: value }));
    setResult(null);
    setError(null);
    setNotice(null);
    setDuration(null);
  };

  const runQuery = () => {
    const current = db.current;
    if (!current || !query.trim()) return;
    setError(null); setNotice(null);
    const started = performance.now();
    try {
      const outputs = current.exec(adaptQuery(query));
      const output = outputs.at(-1);
      setResult(output ? { columns: output.columns, values: output.values } : null);
      setSchema(readSchema(current));
      setDuration(Math.max(1, Math.round(performance.now() - started)));
      if (!output) setNotice(`${current.getRowsModified()} linha(s) alterada(s).`);
    } catch (cause) {
      setResult(null);
      setDuration(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const resetBase = () => {
    if (!db.current || !source.current) return;
    db.current.close();
    // The initializer is cached by sql.js; importing it again is cheap.
    void initSqlJs({ locateFile: () => "/sql-wasm.wasm" }).then((SQL) => {
      const next = new SQL.Database();
      next.exec(source.current);
      db.current = next;
      setSchema(readSchema(next));
      setNotice("Base Universidade restaurada.");
      setError(null);
      setResult(null);
      setDuration(null);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  const toggleComplete = () => setCompleted((previous) =>
    previous.includes(exercise.id) ? previous.filter((id) => id !== exercise.id) : [...previous, exercise.id]
  );

  return <main className="content exercise-content">
    <div className="exercise-heading">
      <div><div className="eyebrow"><i/> TRILHA DE APRENDIZAGEM</div><h1>Exercícios SQL<span>.</span></h1><p>Do primeiro SELECT aos JOINs e agrupamentos, no seu ritmo.</p></div>
      <div className="exercise-summary"><strong>{completed.length}<span> / {exercises.length}</span></strong><small>concluídos</small><div className="progress-track"><i style={{ width: `${percent}%` }}/></div></div>
    </div>
    <div className="exercise-info"><DatabaseIcon size={17}/><span><strong>Base Universidade pronta para praticar</strong> · 16 tabelas e 238 registros do material.</span><button type="button" onClick={resetBase} disabled={!ready}><RotateCcw size={13}/> Reiniciar base</button></div>
    <div className="exercise-layout">
      <aside className="exercise-list" aria-label="Lista de exercícios"><div className="exercise-list-head"><BookOpen size={17}/><div><strong>Roteiro de exercícios</strong><small>Em ordem, sem duplicar as versões</small></div></div>
        <div className="exercise-list-scroll">{topics.map((topic) => {
          const group = exercises.map((entry, position) => ({ entry, position })).filter(({ entry }) => entry.topic === topic);
          return <div className="exercise-group" key={topic}><h2>{topic} <span>{group.length}</span></h2>{group.map(({ entry, position }) => <button type="button" key={entry.id} className={`exercise-list-item ${index === position ? "active" : ""}`} onClick={() => selectExercise(position)}><span className={completed.includes(entry.id) ? "exercise-number done" : "exercise-number"}>{completed.includes(entry.id) ? <Check size={13}/> : String(position + 1).padStart(2, "0")}</span><span><strong>{entry.title}</strong><small>Exercício {entry.id}</small></span></button>)}</div>;
        })}</div>
      </aside>
      <div className="exercise-main">
        <section className="challenge-card"><div className="challenge-meta"><span className="challenge-index">EXERCÍCIO {exercise.id}</span><span>{exercise.topic} · PDF V4, pág. {exercise.page}</span></div><h2>{exercise.title}</h2><p className="challenge-prompt">{exercise.prompt}</p>{exercise.note && <p className="challenge-note"><CircleAlert size={15}/>{exercise.note}</p>}
          <div className="challenge-tables"><div><Table2 size={15}/><strong>Tabelas deste exercício</strong></div><div className="table-chips">{exercise.tables.map((tableName) => <button type="button" key={tableName} className={activeTable === tableName ? "active" : ""} onClick={() => setActiveTable(tableName)}>{tableName}</button>)}</div></div>
          {selected && <div className="exercise-inspector"><div className="exercise-inspector-heading"><strong>Estrutura de <code>{selected.name}</code></strong><span>{selected.count} registros · {selected.columns.length} colunas</span></div><div className="exercise-inspector-columns">{selected.columns.map((column) => <div key={column.name}><span>{column.primary ? <KeyRound size={13}/> : column.foreign ? <Link2 size={13}/> : <i/>}<code>{column.name}</code></span><span><small>{column.type}</small>{column.primary && <em>PK</em>}{column.references && <em>FK → {column.references.table}.{column.references.column}</em>}</span></div>)}</div></div>}
          {relationships.length > 0 && <div className="relationship-list"><Link2 size={14}/><div>{relationships.slice(0, 6).map((relation) => <code key={relation}>{relation}</code>)}{relationships.length > 6 && <span>+{relationships.length - 6} ligações</span>}</div></div>}
          <div className="challenge-actions"><Button variant="outline" onClick={() => selectExercise(index - 1)} disabled={index === 0}><ArrowLeft size={14}/> Anterior</Button><span>{index + 1} de {exercises.length}</span><Button variant="outline" onClick={() => selectExercise(index + 1)} disabled={index === exercises.length - 1}>Próximo <ArrowRight size={14}/></Button></div>
        </section>
        <div className="exercise-work">
          <section className="editor-panel">
            <div className="panel-heading"><div><span className="panel-icon"><Terminal size={18}/></span><span><strong>Sua resposta SQL</strong><small>Rascunho salvo no navegador</small></span></div><span className="sql-badge">● &nbsp;SQL</span></div>
            <div className="editor-area"><div className="line-numbers" aria-hidden="true">{query.split("\n").map((_, line) => <div key={line}>{line + 1}</div>)}</div><textarea ref={editor} aria-label="Sua resposta SQL" spellCheck={false} value={query} onChange={(event) => updateDraft(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); runQuery(); } else if (event.key === "Tab") { event.preventDefault(); const start = event.currentTarget.selectionStart; const end = event.currentTarget.selectionEnd; updateDraft(query.slice(0, start) + "  " + query.slice(end)); requestAnimationFrame(() => editor.current?.setSelectionRange(start + 2, start + 2)); } }} placeholder={`-- Escreva a solução do exercício ${exercise.id} aqui`}/></div>
            <div className="editor-footer"><span>Ctrl / ⌘ + Enter</span><Button className="run-button" disabled={!ready || !query.trim()} onClick={runQuery}><Play size={14} fill="currentColor"/> Executar consulta</Button></div>
            <div className="exercise-terminal" aria-live="polite">
              <div className="exercise-terminal-heading"><div><Rows3 size={15}/><strong>Resultado da sua resposta</strong><span>{result ? `${result.values.length} ${result.values.length === 1 ? "registro" : "registros"}` : error ? "Erro na consulta" : notice ? "Comando executado" : "Aguardando execução"}</span></div>{duration !== null && <small>{duration} ms</small>}</div>
              <div className="exercise-terminal-body">
                {loadingError ? <p className="terminal-message terminal-error"><X size={14}/>{loadingError}</p>
                  : error ? <p className="terminal-message terminal-error"><X size={14}/>{error}</p>
                  : notice ? <p className="terminal-message terminal-success"><Check size={14}/>{notice}</p>
                  : result ? <div className="exercise-terminal-table"><Table className="result-table"><TableHeader><TableRow>{result.columns.map((column, position) => <TableHead key={position}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{result.values.slice(0, 100).map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((value, colIndex) => <TableCell key={colIndex} className={value === null ? "null-value" : ""}>{showValue(value)}</TableCell>)}</TableRow>)}</TableBody></Table>{result.values.length === 0 && <p className="terminal-message">Consulta executada. Nenhum registro retornado.</p>}</div>
                  : <p className="terminal-message terminal-idle"><span className="terminal-prompt">›</span>{ready ? "Execute sua resposta para ver o resultado aqui." : "Carregando a base Universidade..."}</p>}
              </div>
              {result && result.values.length > 100 && <div className="exercise-terminal-footer">Mostrando os primeiros 100 de {result.values.length} registros</div>}
            </div>
            <div className="exercise-editor-note">A base foi adaptada para SQLite. Ao executar, <code>universidade.</code> é removido e <code>ILIKE</code> vira <code>LIKE</code>.</div>
          </section>
        </div>
        <div className="exercise-bottom"><Button className={completed.includes(exercise.id) ? "complete-button completed" : "complete-button"} onClick={toggleComplete}>{completed.includes(exercise.id) ? <CheckCircle2 size={16}/> : <Check size={16}/>} {completed.includes(exercise.id) ? "Concluído" : "Marcar como concluído"}</Button><Button variant="outline" onClick={() => selectExercise(index + 1)} disabled={index === exercises.length - 1}>Próximo exercício <ArrowRight size={15}/></Button></div>
      </div>
    </div>
  </main>;
}
