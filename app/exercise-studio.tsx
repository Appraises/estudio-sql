"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PGlite } from "@electric-sql/pglite";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert, Database as DatabaseIcon, KeyRound, Link2, Play, RotateCcw, Table2, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exercises } from "@/lib/exercises";
import { executeSql, readSchema, showValue, tableKey, tableRef, type QueryResult, type SchemaTable } from "@/lib/postgres";

const topics = ["SQL básico", "JOIN", "OUTER JOIN", "Agregações", "Subconsultas", "CTEs"] as const;
const block14Ids = exercises.filter((entry) => entry.id.startsWith("14.")).map((entry) => entry.id);
const exerciseReferences: Record<string, { title: string; ids: string[] }> = {
  "13.4": { title: "Exercício para comparar", ids: ["13.3"] },
  "13.5": { title: "Junção para reescrever", ids: ["13.4"] },
  "15.1": { title: "Consultas do bloco 14", ids: block14Ids },
  "15.2": { title: "Consultas do bloco 14", ids: block14Ids },
  "19.2": { title: "Busca original", ids: ["10.1"] },
  "26.2": { title: "Cálculos anteriores", ids: ["26.1"] },
  "37.1": { title: "Questão para reescrever", ids: ["36.1"] },
  "44.10": { title: "Questão para refazer", ids: ["44.9"] },
};
const storageKey = "atlas-sql-exercises-v1";
type SavedProgress = { currentId?: string; index?: number; completed: string[]; drafts: Record<string, string> };

export default function ExerciseStudio() {
  const db = useRef<PGlite | null>(null);
  const source = useRef<string>("");
  const editor = useRef<HTMLTextAreaElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserTable, setBrowserTable] = useState<string | null>(null);
  const [browserResult, setBrowserResult] = useState<QueryResult | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const exercise = exercises[index];
  const reference = exerciseReferences[exercise.id];
  const referencedExercises = reference?.ids.map((id) => exercises.find((entry) => entry.id === id)).filter((entry) => entry !== undefined) ?? [];
  const query = drafts[exercise.id] ?? "";
  const relevant = useMemo(() => new Set(exercise.tables), [exercise.tables]);
  const relatedTables = schema.filter((table) => relevant.has(table.name));
  const selectedBrowserTable = schema.find((table) => tableKey(table) === browserTable);
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
    let next: PGlite | null = null;
    void (async () => {
      try {
        const response = await fetch("/universidade.sql");
        if (!response.ok) throw new Error("Não foi possível carregar a base Universidade.");
        const sql = await response.text();
        next = new PGlite();
        await next.waitReady;
        await next.exec(sql);
        await next.exec("SET search_path TO universidade, public;");
        if (cancelled) { await next.close(); return; }
        source.current = sql;
        db.current = next;
        setSchema(await readSchema(next));
        setReady(true);
      } catch (cause) {
        if (!cancelled) setLoadingError(cause instanceof Error ? cause.message : String(cause));
        if (next && !next.closed) await next.close();
      }
    })();
    return () => { cancelled = true; if (next && !next.closed) void next.close(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setResult(null);
      setError(null);
      setNotice(null);
    });
    return () => { active = false; };
  }, [index, ready, exercise.tables]);

  const selectExercise = (next: number) => setIndex(Math.min(Math.max(next, 0), exercises.length - 1));
  const updateDraft = (value: string) => {
    setDrafts((previous) => ({ ...previous, [exercise.id]: value }));
    setResult(null);
    setError(null);
    setNotice(null);
  };

  const inspectDatabaseTable = async (table: SchemaTable) => {
    const current = db.current;
    if (!current) return;
    setBrowserTable(tableKey(table));
    setBrowserError(null);
    try {
      setBrowserResult((await executeSql(current, `SELECT * FROM ${tableRef(table)} LIMIT 100;`)).result);
    } catch (cause) {
      setBrowserResult(null);
      setBrowserError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const openDatabaseBrowser = (table = relatedTables[0] ?? schema[0]) => {
    if (!table) return;
    void inspectDatabaseTable(table);
    setBrowserOpen(true);
  };

  const runQuery = async () => {
    const current = db.current;
    if (!current || !query.trim()) return;
    setError(null); setNotice(null);
    try {
      const { result: output, rowsChanged, statementCount } = await executeSql(current, query);
      setResult(output);
      setSchema(await readSchema(current));
      if (!output) setNotice(statementCount === 0 ? "Nenhum comando SQL para executar." : rowsChanged > 0 ? `${rowsChanged} linha(s) alterada(s).` : "Comando executado.");
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const resetBase = async () => {
    if (!db.current || !source.current) return;
    let next: PGlite | null = null;
    try {
      next = new PGlite();
      await next.waitReady;
      await next.exec(source.current);
      await next.exec("SET search_path TO universidade, public;");
      const previous = db.current;
      db.current = next;
      next = null;
      if (!previous.closed) await previous.close();
      setSchema(await readSchema(db.current));
      setNotice("Base Universidade restaurada.");
      setError(null);
      setResult(null);
    } catch (cause) {
      if (next && !next.closed) await next.close();
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const toggleComplete = () => setCompleted((previous) =>
    previous.includes(exercise.id) ? previous.filter((id) => id !== exercise.id) : [...previous, exercise.id]
  );

  return <main className="content exercise-content">
    <div className="exercise-heading">
      <div><div className="eyebrow"><i/> TRILHA DE APRENDIZAGEM</div><h1>Exercícios SQL<span>.</span></h1><p>Do primeiro SELECT aos JOINs e agrupamentos, no seu ritmo.</p></div>
      <div className="exercise-summary"><strong>{completed.length}<span> / {exercises.length}</span></strong><small>concluídos</small><div className="progress-track"><i style={{ width: `${percent}%` }}/></div></div>
    </div>
    <div className="exercise-info"><DatabaseIcon size={17}/><span><strong>Base Universidade pronta para praticar</strong> · 16 tabelas e 238 registros do material.</span><div className="exercise-info-actions"><button type="button" onClick={() => openDatabaseBrowser()} disabled={!ready}><Table2 size={13}/> Explorar banco</button><button type="button" onClick={resetBase} disabled={!ready}><RotateCcw size={13}/> Reiniciar base</button></div></div>
    <div className="exercise-layout">
      <aside className="exercise-list" aria-label="Lista de exercícios"><div className="exercise-list-head"><BookOpen size={17}/><div><strong>Roteiro de exercícios</strong><small>Em ordem, sem duplicar as versões</small></div></div>
        <div className="exercise-list-scroll">{topics.map((topic) => {
          const group = exercises.map((entry, position) => ({ entry, position })).filter(({ entry }) => entry.topic === topic);
          return <div className="exercise-group" key={topic}><h2>{topic} <span>{group.length}</span></h2>{group.map(({ entry, position }) => <button type="button" key={entry.id} className={`exercise-list-item ${index === position ? "active" : ""}`} onClick={() => selectExercise(position)}><span className={completed.includes(entry.id) ? "exercise-number done" : "exercise-number"}>{completed.includes(entry.id) ? <Check size={13}/> : String(position + 1).padStart(2, "0")}</span><span><strong>{entry.title}</strong><small>Exercício {entry.id}</small></span></button>)}</div>;
        })}</div>
      </aside>
      <div className="exercise-main">
        <section className="challenge-card"><div className="challenge-meta"><span className="challenge-index">EXERCÍCIO {exercise.id}</span><span>{exercise.page ? `${exercise.topic} · ${exercise.source ?? "PDF V4"}, pág. ${exercise.page}` : `${exercise.topic} · Prática extra`}</span></div><h2>{exercise.title}</h2><p className="challenge-prompt">{exercise.prompt}</p>{exercise.note && <p className="challenge-note"><CircleAlert size={15}/>{exercise.note}</p>}
          {reference && <section className="challenge-recap" aria-labelledby="exercise-references-heading"><div className="challenge-recap-heading"><BookOpen size={14}/><h3 id="exercise-references-heading">{reference.title}</h3><span>{referencedExercises.length} {referencedExercises.length === 1 ? "exercício" : "exercícios"}</span></div><ol className="challenge-recap-list">{referencedExercises.map((entry) => <li key={entry.id}><span>{entry.id}</span><div><strong>{entry.title}</strong><p>{entry.prompt}</p></div></li>)}</ol></section>}
          {relationships.length > 0 && <div className="relationship-list"><Link2 size={14}/><div>{relationships.slice(0, 6).map((relation) => <code key={relation}>{relation}</code>)}{relationships.length > 6 && <span>+{relationships.length - 6} ligações</span>}</div></div>}
          <div className="challenge-actions"><Button variant="outline" onClick={() => selectExercise(index - 1)} disabled={index === 0}><ArrowLeft size={14}/> Anterior</Button><span>{index + 1} de {exercises.length}</span><Button variant="outline" onClick={() => selectExercise(index + 1)} disabled={index === exercises.length - 1}>Próximo <ArrowRight size={14}/></Button></div>
        </section>
        <section className="exercise-schema-section"><div className="section-heading"><div><small>MAPA DO EXERCÍCIO</small><h2>Estrutura das tabelas <span>{relatedTables.length}</span></h2></div></div><div className="schema-grid exercise-schema-grid">{relatedTables.map((table, position) => <button type="button" key={table.key} className="schema-card" onClick={() => openDatabaseBrowser(table)} aria-label={`Ver dados da tabela ${table.name}`}><div className="card-heading"><span className={`table-icon color-${position % 4}`}><Table2 size={17}/></span><span><strong>{table.name}</strong><small>{table.count} {table.count === 1 ? "registro" : "registros"}</small></span><b>↗</b></div><div className="columns">{table.columns.slice(0, 5).map((column) => <div key={column.name}><span>{column.primary ? <KeyRound size={13} className="primary-key"/> : column.foreign ? <Link2 size={13} className="foreign-key"/> : <i/>}{column.name}</span><code>{column.type}</code></div>)}{table.columns.length > 5 && <p>+ {table.columns.length - 5} colunas</p>}</div><div className="card-footer"><span>{table.columns.length} colunas</span><span>Ver dados →</span></div></button>)}</div></section>
        <div className="exercise-work">
          <section className="editor-panel">
            <div className="panel-heading"><div><span className="panel-icon"><Terminal size={18}/></span><span><strong>Sua resposta SQL</strong><small>Rascunho salvo no navegador</small></span></div><span className="sql-badge">● &nbsp;SQL</span></div>
            <div className="editor-area"><div className="line-numbers" aria-hidden="true">{query.split("\n").map((_, line) => <div key={line}>{line + 1}</div>)}</div><textarea ref={editor} aria-label="Sua resposta SQL" spellCheck={false} value={query} onChange={(event) => updateDraft(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void runQuery(); } else if (event.key === "Tab") { event.preventDefault(); const start = event.currentTarget.selectionStart; const end = event.currentTarget.selectionEnd; updateDraft(query.slice(0, start) + "  " + query.slice(end)); requestAnimationFrame(() => editor.current?.setSelectionRange(start + 2, start + 2)); } }} placeholder={`-- Escreva a solução do exercício ${exercise.id} aqui`}/></div>
            <div className="editor-footer"><span>Ctrl / ⌘ + Enter</span><Button className="run-button" disabled={!ready || !query.trim()} onClick={() => void runQuery()}><Play size={14} fill="currentColor"/> Executar consulta</Button></div>
            <div className="exercise-terminal" aria-label="Saída da consulta SQL" aria-live="polite">
              <div className="exercise-terminal-body">
                {loadingError ? <p className="terminal-message terminal-error"><X size={14}/>{loadingError}</p>
                  : error ? <p className="terminal-message terminal-error"><X size={14}/>{error}</p>
                  : notice ? <p className="terminal-message terminal-success"><Check size={14}/>{notice}</p>
                  : result ? <div className="exercise-terminal-table"><Table className="result-table"><TableHeader><TableRow>{result.columns.map((column, position) => <TableHead key={position}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{result.values.slice(0, 100).map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((value, colIndex) => <TableCell key={colIndex} className={value === null ? "null-value" : ""}>{showValue(value)}</TableCell>)}</TableRow>)}</TableBody></Table>{result.values.length === 0 && <p className="terminal-message">Consulta executada. Nenhum registro retornado.</p>}</div>
                  : <p className="terminal-message terminal-idle"><span className="terminal-prompt">›</span>{ready ? "Execute sua resposta para ver o resultado aqui." : "Carregando a base Universidade..."}</p>}
              </div>
              {result && result.values.length > 100 && <div className="exercise-terminal-footer">Mostrando os primeiros 100 de {result.values.length} registros</div>}
            </div>
            <div className="exercise-editor-note">PostgreSQL real no navegador. A base usa o schema <code>universidade</code>; o <code>search_path</code> já está configurado para ele.</div>
          </section>
        </div>
        <div className="exercise-bottom"><Button className={completed.includes(exercise.id) ? "complete-button completed" : "complete-button"} onClick={toggleComplete}>{completed.includes(exercise.id) ? <CheckCircle2 size={16}/> : <Check size={16}/>} {completed.includes(exercise.id) ? "Concluído" : "Marcar como concluído"}</Button><Button variant="outline" onClick={() => selectExercise(index + 1)} disabled={index === exercises.length - 1}>Próximo exercício <ArrowRight size={15}/></Button></div>
      </div>
    </div>
    <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
      <DialogContent className="database-dialog" showCloseButton={false}>
        <div className="database-dialog-heading"><div><span className="database-dialog-icon"><DatabaseIcon size={19}/></span><div><DialogTitle>Explorar banco Universidade</DialogTitle><DialogDescription>Veja os registros das tabelas sem alterar sua resposta SQL.</DialogDescription></div></div><DialogClose asChild><button type="button" className="database-dialog-close" aria-label="Fechar explorador"><X size={18}/></button></DialogClose></div>
        <div className="database-dialog-layout">
          <nav className="database-dialog-list" aria-label="Tabelas da base Universidade"><div className="database-dialog-list-title">TABELAS <span>{schema.length}</span></div>{schema.map((table) => <button type="button" key={table.key} className={browserTable === tableKey(table) ? "active" : ""} onClick={() => void inspectDatabaseTable(table)}><Table2 size={15}/><span>{table.name}</span><small>{table.count}</small></button>)}</nav>
          <section className="database-dialog-data" aria-label="Dados da tabela selecionada"><div className="database-dialog-data-heading"><div><strong>{selectedBrowserTable?.name ?? "Selecione uma tabela"}</strong><span>{selectedBrowserTable ? `${selectedBrowserTable.count} ${selectedBrowserTable.count === 1 ? "registro" : "registros"} · ${selectedBrowserTable.columns.length} colunas` : ""}</span></div><span>Somente leitura</span></div>
            <div className="database-dialog-table">{browserError ? <p className="database-dialog-empty">{browserError}</p> : browserResult ? <><Table className="result-table"><TableHeader><TableRow>{browserResult.columns.map((column, position) => <TableHead key={position}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{browserResult.values.slice(0, 100).map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((value, colIndex) => <TableCell key={colIndex} className={value === null ? "null-value" : ""}>{showValue(value)}</TableCell>)}</TableRow>)}</TableBody></Table>{browserResult.values.length === 0 && <p className="database-dialog-empty">Esta tabela ainda não tem registros.</p>}</> : <p className="database-dialog-empty">Selecione uma tabela para ver os dados.</p>}</div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </main>;
}
