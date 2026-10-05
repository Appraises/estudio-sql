"""Adapt the supplied PostgreSQL university dump for the browser's SQLite engine."""
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "data/universidade-postgres.sql").read_text(encoding="utf-8")
data = source[source.index("INSERT INTO universidade.departamento") :]
data = data.replace("universidade.", "")
data = re.sub(r"'(\d{4})/(\d{2})/(\d{2})'", r"'\1-\2-\3'", data)

schema = """
-- Base Universidade do material de Engenharia de Dados, adaptada para SQLite.
-- Tipos DOMAIN/ENUM/ARRAY do PostgreSQL foram armazenados como TEXT.
PRAGMA foreign_keys = OFF;
CREATE TABLE usuario (
  cpf TEXT PRIMARY KEY, nome TEXT NOT NULL, data_nascimento TEXT,
  email TEXT, telefone TEXT, login TEXT UNIQUE, senha TEXT
);
CREATE TABLE professor (
  mat_professor TEXT PRIMARY KEY, cpf TEXT UNIQUE, departamento TEXT,
  formacao TEXT, data_admissao TEXT, tipo_jornada_trabalho TEXT, salario REAL,
  FOREIGN KEY (cpf) REFERENCES usuario(cpf),
  FOREIGN KEY (departamento) REFERENCES departamento(cod_depto)
);
CREATE TABLE departamento (
  cod_depto TEXT PRIMARY KEY, nome TEXT NOT NULL, chefe TEXT,
  orcamento REAL CHECK (orcamento > 0), comissal REAL,
  FOREIGN KEY (chefe) REFERENCES professor(mat_professor)
);
CREATE TABLE curso (
  idCurso INTEGER PRIMARY KEY, nome TEXT NOT NULL, grau TEXT, turno TEXT NOT NULL,
  campus TEXT, nivel TEXT, UNIQUE(nome, turno, campus, nivel)
);
CREATE TABLE estudante (
  mat_estudante TEXT PRIMARY KEY, cpf TEXT UNIQUE, MC REAL, ano_ingresso INTEGER,
  FOREIGN KEY (cpf) REFERENCES usuario(cpf)
);
CREATE TABLE vinculo (
  idVinculo INTEGER PRIMARY KEY, mat_estudante TEXT, curso INTEGER,
  data_entrada TEXT, status TEXT, data_saida TEXT,
  FOREIGN KEY (curso) REFERENCES curso(idCurso),
  FOREIGN KEY (mat_estudante) REFERENCES estudante(mat_estudante)
);
CREATE TABLE projeto (id_projeto INTEGER PRIMARY KEY, descricao TEXT);
CREATE TABLE plano (
  id_projeto INTEGER, mat_professor TEXT, mat_estudante TEXT, ano INTEGER,
  PRIMARY KEY (mat_estudante, ano),
  FOREIGN KEY (id_projeto) REFERENCES projeto(id_projeto),
  FOREIGN KEY (mat_professor) REFERENCES professor(mat_professor),
  FOREIGN KEY (mat_estudante) REFERENCES estudante(mat_estudante)
);
CREATE TABLE disciplina (
  cod_disc TEXT PRIMARY KEY, nome TEXT NOT NULL, pre_req TEXT,
  creditos INTEGER CHECK (creditos >= 1 AND creditos < 12), depto_responsavel TEXT,
  FOREIGN KEY (pre_req) REFERENCES disciplina(cod_disc),
  FOREIGN KEY (depto_responsavel) REFERENCES departamento(cod_depto)
);
CREATE TABLE semestre (
  ano INTEGER, semestre INTEGER, data_inicio TEXT, data_fom TEXT,
  PRIMARY KEY (ano, semestre)
);
CREATE TABLE sala (id_sala INTEGER PRIMARY KEY, descricao TEXT);
CREATE TABLE horario (id_horario INTEGER PRIMARY KEY, dia TEXT NOT NULL, slot INTEGER NOT NULL);
CREATE TABLE turma (
  id_turma INTEGER PRIMARY KEY, cod_disc TEXT NOT NULL, numero INTEGER,
  ano INTEGER, semestre INTEGER, UNIQUE(cod_disc, numero, semestre, ano),
  FOREIGN KEY (cod_disc) REFERENCES disciplina(cod_disc),
  FOREIGN KEY (ano, semestre) REFERENCES semestre(ano, semestre)
);
CREATE TABLE leciona (
  id_turma INTEGER NOT NULL, mat_professor TEXT NOT NULL,
  PRIMARY KEY (id_turma, mat_professor),
  FOREIGN KEY (id_turma) REFERENCES turma(id_turma),
  FOREIGN KEY (mat_professor) REFERENCES professor(mat_professor)
);
CREATE TABLE alocacao (
  id_turma INTEGER, id_horario INTEGER, id_sala INTEGER,
  PRIMARY KEY (id_turma, id_horario), UNIQUE(id_horario, id_sala)
);
CREATE TABLE cursa (
  mat_estudante TEXT, id_turma INTEGER, nota REAL,
  PRIMARY KEY (mat_estudante, id_turma),
  FOREIGN KEY (id_turma) REFERENCES turma(id_turma),
  FOREIGN KEY (mat_estudante) REFERENCES estudante(mat_estudante)
);
"""

output = schema + "\n" + data + "\nPRAGMA foreign_keys = ON;\n"
connection = sqlite3.connect(":memory:")
connection.executescript(output)
issues = connection.execute("PRAGMA foreign_key_check").fetchall()
if issues:
    raise SystemExit(f"Foreign key check failed: {issues[:5]}")
counts = connection.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchone()[0]
rows = sum(connection.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0] for (name,) in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
(ROOT / "public/universidade.sql").write_text(output, encoding="utf-8")
print(f"University dataset: {counts} tables, {rows} rows, foreign keys valid")
