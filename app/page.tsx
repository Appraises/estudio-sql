"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { BookOpen, Braces, Check, ChevronDown, Clock3, Command, DatabaseZap, FileCode2, KeyRound, Layers3, Link2, ListFilter, Play, RotateCcw, Rows3, Table2, UploadCloud, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Column = { name: string; type: string; primary: boolean; foreign: boolean };
type SchemaTable = { name: string; columns: Column[]; count: number };
type QueryResult = { columns: string[]; values: (string | number | null | Uint8Array)[][] };

const demoSql = `CREATE TABLE cursos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, area TEXT NOT NULL);
CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL, idade INTEGER NOT NULL);
CREATE TABLE matriculas (id INTEGER PRIMARY KEY, aluno_id INTEGER NOT NULL, curso_id INTEGER NOT NULL, nota REAL,
  FOREIGN KEY (aluno_id) REFERENCES alunos(id), FOREIGN KEY (curso_id) REFERENCES cursos(id));
INSERT INTO cursos VALUES (1,'Banco de Dados','Tecnologia'),(2,'Design Digital','Criatividade'),(3,'Estatística','Ciências');
INSERT INTO alunos VALUES (1,'Ana Costa','São Paulo',22),(2,'Bruno Lima','Campinas',25),(3,'Carla Souza','São Paulo',21),(4,'Diego Alves','Santos',27),(5,'Elisa Rocha','Campinas',23);
INSERT INTO matriculas VALUES (1,1,1,9.2),(2,1,3,8.5),(3,2,1,7.8),(4,3,2,9.6),(5,4,1,6.9),(6,5,3,8.8),(7,5,1,9.1);`;
const examples = [
  { label: "Explorar dados", icon: Rows3, sql: "SELECT * FROM alunos LIMIT 10;" },
  { label: "Praticar JOIN", icon: Link2, sql: "SELECT a.nome AS aluno, c.nome AS curso, m.nota\nFROM matriculas AS m\nJOIN alunos AS a ON a.id = m.aluno_id\nJOIN cursos AS c ON c.id = m.curso_id\nORDER BY m.nota DESC;" },
  { label: "Agrupar resultados", icon: ListFilter, sql: "SELECT c.nome AS curso, COUNT(*) AS total_alunos, ROUND(AVG(m.nota), 1) AS media\nFROM matriculas AS m\nJOIN cursos AS c ON c.id = m.curso_id\nGROUP BY c.id, c.nome\nORDER BY media DESC;" },
];
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
function readSchema(db: Database): SchemaTable[] {
  const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? [];
  return names.map(([raw]) => {
    const name = String(raw);
    const info = db.exec(`PRAGMA table_info(${quote(name)})`)[0]?.values ?? [];
    const keys = db.exec(`PRAGMA foreign_key_list(${quote(name)})`)[0]?.values ?? [];
    const foreign = new Set(keys.map((row) => String(row[3])));
    const count = Number(db.exec(`SELECT COUNT(*) FROM ${quote(name)}`)[0]?.values[0]?.[0] ?? 0);
    return { name, count, columns: info.map((row) => ({ name: String(row[1]), type: String(row[2] || "—"), primary: Number(row[5]) > 0, foreign: foreign.has(String(row[1])) })) };
  });
}
function showValue(value: string | number | null | Uint8Array) {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `[BLOB · ${value.length} bytes]`;
  return String(value);
}

export default function Home() {
  const engine = useRef<SqlJsStatic | null>(null);
  const database = useRef<Database | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const editor = useRef<HTMLTextAreaElement | null>(null);
  const [ready, setReady] = useState(false);
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [name, setName] = useState("Banco de exemplo");
  const [activeTable, setActiveTable] = useState<string | null>("alunos");
  const [query, setQuery] = useState(examples[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [resultTitle, setResultTitle] = useState("alunos");
  const [tab, setTab] = useState<"dados" | "estrutura">("dados");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [runCount, setRunCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    initSqlJs({ locateFile: () => "/sql-wasm.wasm" }).then((SQL) => {
      if (cancelled) return;
      engine.current = SQL;
      const db = new SQL.Database();
      db.exec(demoSql);
      database.current = db;
      setSchema(readSchema(db));
      const first = db.exec(examples[0].sql)[0];
      setResult({ columns: first.columns, values: first.values });
      setReady(true);
    }).catch((cause) => setError(`Não foi possível iniciar o banco: ${String(cause)}`));
    return () => { cancelled = true; };
  }, []);

  const runQuery = useCallback((sql = query) => {
    const db = database.current;
    if (!db || !sql.trim()) return;
    setError(null); setNotice(null);
    const started = performance.now();
    try {
      const outputs = db.exec(sql);
      const last = outputs.at(-1);
      setResult(last ? { columns: last.columns, values: last.values } : null);
      setResultTitle(last ? "Resultado da consulta" : "Comando executado");
      setDuration(Math.max(1, Math.round(performance.now() - started)));
      setSchema(readSchema(db));
      setRunCount((count) => count + 1);
      setTab("dados");
      if (!last) setNotice(`${db.getRowsModified()} linha(s) alterada(s).`);
    } catch (cause) {
      setDuration(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [query]);

  const viewTable = (tableName: string) => {
    setActiveTable(tableName);
    const sql = `SELECT * FROM ${quote(tableName)} LIMIT 100;`;
    setQuery(sql);
    const output = database.current?.exec(sql)[0];
    setResult(output ? { columns: output.columns, values: output.values } : null);
    setResultTitle(tableName);
    setTab("dados"); setError(null); setNotice(null); setDuration(null);
  };

  const loadDemo = () => {
    const SQL = engine.current;
    if (!SQL) return;
    const next = new SQL.Database();
    next.exec(demoSql);
    database.current?.close(); database.current = next;
    setSchema(readSchema(next)); setName("Banco de exemplo"); setActiveTable("alunos");
    setQuery(examples[0].sql);
    const first = next.exec(examples[0].sql)[0];
    setResult({ columns: first.columns, values: first.values });
    setResultTitle("alunos"); setTab("dados"); setError(null);
    setNotice("Banco de exemplo restaurado."); setRunCount(0); setDuration(null);
  };

  const importFile = async (file: File) => {
    const SQL = engine.current;
    if (!SQL) return;
    setBusy(true); setError(null); setNotice(null);
    let next: Database | null = null;
    try {
      const sql = await file.text();
      next = new SQL.Database();
      next.exec("PRAGMA foreign_keys=OFF;");
      next.exec(sql);
      next.exec("PRAGMA foreign_keys=ON;");
      const tables = readSchema(next);
      database.current?.close(); database.current = next; next = null;
      setSchema(tables); setName(file.name); setActiveTable(tables[0]?.name ?? null);
      const nextQuery = tables[0] ? `SELECT * FROM ${quote(tables[0].name)} LIMIT 100;` : "SELECT name FROM sqlite_master;";
      setQuery(nextQuery);
      const output = database.current.exec(nextQuery)[0];
      setResult(output ? { columns: output.columns, values: output.values } : null);
      setResultTitle(tables[0]?.name ?? "Banco importado");
      setTab("dados"); setRunCount(0); setDuration(null);
      setNotice(`${file.name} importado com sucesso.`);
    } catch (cause) {
      next?.close();
      setError(`Falha ao importar ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}. Verifique se o arquivo usa sintaxe SQLite.`);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const selected = schema.find((table) => table.name === activeTable);
  const totalRows = schema.reduce((sum, table) => sum + table.count, 0);
  const practiceExamples = name === "Banco de exemplo" ? examples : selected ? [
    { label: "Explorar dados", icon: Rows3, sql: `SELECT * FROM ${quote(selected.name)} LIMIT 10;` },
    { label: "Contar registros", icon: ListFilter, sql: `SELECT COUNT(*) AS total FROM ${quote(selected.name)};` },
    { label: "Ver estrutura", icon: Table2, sql: `PRAGMA table_info(${quote(selected.name)});` },
  ] : [];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><DatabaseZap size={19}/></div><span>atlas<span className="brand-dot">.</span><small>SQL LAB</small></span></div>
      <div className="sidebar-label">WORKSPACE <span /></div>
      <button type="button" className="database-selector" onClick={() => fileInput.current?.click()}><span className="database-icon"><FileCode2 size={18}/></span><span className="database-name"><strong>{name}</strong><small>{schema.length} {schema.length === 1 ? "tabela" : "tabelas"} no banco</small></span><ChevronDown size={15}/></button>
      <div className="sidebar-title">TABELAS <span>{schema.length}</span></div>
      <nav className="table-nav" aria-label="Tabelas do banco">{schema.length ? schema.map((table) => <button type="button" key={table.name} className={activeTable === table.name ? "active" : ""} onClick={() => viewTable(table.name)}><Table2 size={16}/><span>{table.name}</span><small>{table.count}</small></button>) : <p>Importe um script para ver as tabelas.</p>}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><BookOpen size={18}/><strong>Espaço de prática</strong><p>Explore tabelas, teste consultas e aprenda fazendo.</p></div><div className="sidebar-status"><i/> SQLite no navegador <span>v1.0</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span><strong>{name}</strong></div><div className="topbar-right"><span><i/> Ambiente local</span><b>S</b></div></header>
      <main className="content">
        <div className="page-heading"><div><div className="eyebrow"><i/> SEU AMBIENTE DE ESTUDOS</div><h1>Laboratório SQL<span>.</span></h1><p>Explore a estrutura, escreva consultas e veja os dados ganharem sentido.</p></div><div className="heading-actions"><input ref={fileInput} type="file" accept=".sql,text/plain,application/sql" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }}/><Button variant="outline" onClick={loadDemo} disabled={!ready}><RotateCcw size={15}/> Restaurar exemplo</Button><Button className="import-button" onClick={() => fileInput.current?.click()} disabled={!ready || busy}><UploadCloud size={17}/> {busy ? "Importando..." : "Importar .sql"}</Button></div></div>
        <div className="stats"><div className="stat"><span className="stat-icon purple"><Layers3 size={17}/></span><span><strong>{schema.length}</strong><small>Tabelas</small></span></div><div className="stat"><span className="stat-icon blue"><Rows3 size={17}/></span><span><strong>{totalRows}</strong><small>Registros</small></span></div><div className="stat"><span className="stat-icon orange"><Braces size={17}/></span><span><strong>{runCount}</strong><small>Consultas executadas</small></span></div><p>Compatível com sintaxe SQLite</p></div>
        <section className="schema-section"><div className="section-heading"><div><small>MAPA DO BANCO</small><h2>Estrutura das tabelas <span>{schema.length}</span></h2></div><p>Clique em uma tabela para explorar</p></div><div className="schema-grid">{schema.length ? schema.map((table, index) => <button type="button" key={table.name} className={`schema-card ${activeTable === table.name ? "selected" : ""}`} onClick={() => viewTable(table.name)}><div className="card-heading"><span className={`table-icon color-${index % 4}`}><Table2 size={17}/></span><span><strong>{table.name}</strong><small>{table.count} {table.count === 1 ? "registro" : "registros"}</small></span><b>↗</b></div><div className="columns">{table.columns.slice(0,5).map((column) => <div key={column.name}><span>{column.primary ? <KeyRound size={13} className="primary-key"/> : column.foreign ? <Link2 size={13} className="foreign-key"/> : <i/>}{column.name}</span><code>{column.type}</code></div>)}{table.columns.length > 5 && <p>+ {table.columns.length - 5} colunas</p>}</div><div className="card-footer"><span>{table.columns.length} colunas</span><span>Ver dados →</span></div></button>) : <div className="schema-empty"><Table2 size={25}/><strong>Nenhuma tabela encontrada</strong><span>Importe um arquivo SQL com CREATE TABLE para começar.</span></div>}</div></section>
        <div className="work-grid"><section className="editor-panel"><div className="panel-heading"><div><span className="panel-icon"><Braces size={18}/></span><span><strong>Editor de consultas</strong><small>Escreva e execute seu SQL</small></span></div><span className="sql-badge">● &nbsp;SQL</span></div><div className="editor-area"><div className="line-numbers" aria-hidden="true">{query.split("\n").map((_, index) => <div key={index}>{index + 1}</div>)}</div><textarea ref={editor} aria-label="Consulta SQL" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); runQuery(); } else if (event.key === "Tab") { event.preventDefault(); const start = event.currentTarget.selectionStart; const end = event.currentTarget.selectionEnd; setQuery(query.slice(0,start) + "  " + query.slice(end)); requestAnimationFrame(() => editor.current?.setSelectionRange(start+2,start+2)); } }} placeholder="-- Escreva sua consulta SQL aqui"/></div><div className="editor-footer"><span><Command size={13}/> + Enter para executar</span><Button className="run-button" disabled={!ready || !query.trim()} onClick={() => runQuery()}><Play size={14} fill="currentColor"/> Executar consulta</Button></div><div className="examples"><h3><WandSparkles size={15}/> EXEMPLOS PARA PRATICAR</h3><div>{practiceExamples.map((example) => <button type="button" key={example.label} onClick={() => { setQuery(example.sql); editor.current?.focus(); }}><example.icon size={15}/>{example.label}</button>)}</div></div></section>
        <section className="results-panel"><div className="panel-heading"><div><span className="panel-icon green"><Rows3 size={18}/></span><span><strong>Resultados</strong><small>{resultTitle}</small></span></div>{duration !== null && <span className="duration"><Clock3 size={13}/>{duration} ms</span>}</div><div className="result-tabs"><button type="button" className={tab === "dados" ? "active" : ""} onClick={() => setTab("dados")}>Dados {result && <span>{result.values.length}</span>}</button><button type="button" className={tab === "estrutura" ? "active" : ""} onClick={() => setTab("estrutura")}>Estrutura</button></div>{error && <div className="message error"><X size={15}/><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Fechar erro"><X size={13}/></button></div>}{notice && !error && <div className="message success"><Check size={15}/><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={13}/></button></div>}<div className="result-content">{tab === "dados" ? (result ? <><Table className="result-table"><TableHeader><TableRow>{result.columns.map((column,index) => <TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{result.values.slice(0,100).map((row,rowIndex) => <TableRow key={rowIndex}>{row.map((value,colIndex) => <TableCell key={colIndex} className={value === null ? "null-value" : ""}>{showValue(value)}</TableCell>)}</TableRow>)}</TableBody></Table>{result.values.length === 0 && <p className="empty-result">A consulta não retornou registros.</p>}</> : <p className="empty-result">Execute uma consulta para ver os resultados.</p>) : (selected ? <div className="structure-list">{selected.columns.map((column) => <div key={column.name}><span>{column.primary ? <KeyRound size={15}/> : column.foreign ? <Link2 size={15}/> : <i/>}{column.name}</span><span>{column.type}{column.primary && <em>PRIMARY KEY</em>}{column.foreign && <em>FOREIGN KEY</em>}</span></div>)}</div> : <p className="empty-result">Selecione uma tabela para ver a estrutura.</p>)}</div><div className="result-footer"><span>{tab === "dados" ? `${result?.values.length ?? 0} registros exibidos` : `${selected?.columns.length ?? 0} colunas`}</span><span><i/>{ready ? "Pronto para consultar" : "Iniciando banco..."}</span></div></section></div>
        <footer className="page-footer"><span>Feito para aprender SQL, uma consulta de cada vez.</span><span>Seus dados ficam nesta aba do navegador.</span></footer>
      </main>
    </div>
  </div>;
}
