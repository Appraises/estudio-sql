export type Exercise = {
  id: string;
  topic: "SQL básico" | "JOIN" | "OUTER JOIN" | "Agregações" | "Subconsultas" | "CTEs";
  title: string;
  prompt: string;
  tables: string[];
  page?: number;
  source?: string;
  note?: string;
};

const item = (
  id: string,
  topic: Exercise["topic"],
  title: string,
  prompt: string,
  tables: string[],
  page?: number,
  note?: string,
  source?: string,
): Exercise => ({ id, topic, title, prompt, tables, page, note, source });

// The four supplied PDFs are cumulative revisions. V4 contains the latest
// wording; repeated questions are listed once, in their original sequence.
export const exercises: Exercise[] = [
  item("5.1", "SQL básico", "CPF e MC", "Liste o CPF e a MC de cada estudante.", ["estudante"], 2),
  item("5.2", "SQL básico", "Todas as turmas", "Liste todas as colunas da tabela turma.", ["turma"], 2),
  item("5.3", "SQL básico", "Estudantes matriculados", "Liste as matrículas dos estudantes que estão cursando alguma turma.", ["cursa"], 2),
  item("7.1", "SQL básico", "Turma 1", "Liste as matrículas dos alunos que estão cursando a turma de id 1.", ["cursa"], 2),
  item("7.2", "SQL básico", "Nascidos nos anos 1990", "Liste os nomes dos usuários nascidos entre 1990 e 1999, em ordem alfabética.", ["usuario"], 2),
  item("7.3", "SQL básico", "Professores do DMA", "Liste os CPFs dos professores do departamento DMA.", ["professor"], 2),
  item("7.4", "SQL básico", "Turmas de E101", "Liste os ids das turmas cursadas pelo estudante de matrícula E101.", ["cursa"], 2),
  item("10.1", "SQL básico", "Orientadores ou chefes", "Liste as matrículas dos professores que orientam algum aluno ou chefiam algum departamento.", ["plano", "departamento"], 2),
  item("10.2", "SQL básico", "Orientadores e chefes", "Liste as matrículas dos professores que orientam algum aluno e também chefiam algum departamento.", ["plano", "departamento"], 3),
  item("10.3", "SQL básico", "Orientadores que não chefiam", "Liste as matrículas dos professores orientadores que não chefiam departamentos.", ["plano", "departamento"], 3),
  item("12.1", "SQL básico", "Usuários com telefone", "Liste nome e CPF dos usuários que têm telefone.", ["usuario"], 3),
  item("12.2", "SQL básico", "Pré-requisito e créditos", "Liste nome e código das disciplinas que têm pré-requisito e mais de 2 créditos.", ["disciplina"], 3),
  item("12.3", "SQL básico", "Nomes iniciados por Prof", "Liste os nomes de usuários que começam com “Prof”.", ["usuario"], 3),
  item("12.4", "SQL básico", "Disciplinas de dados", "Liste os nomes das disciplinas que contêm a palavra “dados”.", ["disciplina"], 3, "No PostgreSQL, você pode usar ILIKE para buscar sem diferenciar maiúsculas de minúsculas."),

  item("13.3", "JOIN", "Juntando todas as linhas", "Execute uma junção entre cursa e estudante com condição sempre verdadeira. Observe o número de linhas retornadas.", ["cursa", "estudante"], 6),
  item("13.4", "JOIN", "Junção pela matrícula", "Junte cursa e estudante relacionando a matrícula do estudante nas duas tabelas. Compare com o exercício anterior.", ["cursa", "estudante"], 6),
  item("13.5", "JOIN", "Usando aliases com AS", "Pesquise o uso de AS e reescreva a junção entre cursa e estudante usando aliases curtos para as tabelas.", ["cursa", "estudante"], 7),
  item("13.6", "JOIN", "CPF dos alunos que cursam", "Liste, sem repetições, os CPFs dos estudantes que cursam alguma turma.", ["cursa", "estudante"], 7),
  item("14.1", "JOIN", "Nomes dos estudantes", "Liste o nome de cada estudante, juntando estudante e usuario.", ["estudante", "usuario"], 7),
  item("14.2", "JOIN", "Nomes dos professores", "Liste nome e matrícula de cada professor.", ["professor", "usuario"], 7),
  item("14.3", "JOIN", "Professores que lecionam", "Liste os CPFs dos professores que lecionam turmas.", ["leciona", "professor"], 8),
  item("14.4", "JOIN", "Disciplinas das turmas", "Liste o nome da disciplina de cada turma.", ["turma", "disciplina"], 8),
  item("14.5", "JOIN", "Departamento responsável", "Liste o nome de cada disciplina e o nome do departamento responsável.", ["disciplina", "departamento"], 8),
  item("14.6", "JOIN", "Pré-requisito por nome", "Liste o nome da disciplina e o nome de seu pré-requisito.", ["disciplina"], 8),
  item("14.7", "JOIN", "Semestre da turma", "Liste o id da turma e as datas de início e fim do seu semestre.", ["turma", "semestre"], 8, "Datas ilustrativas: no dump original, ambas são NULL. Aqui as colunas são semestre e data_fom; o gabarito usa periodo e data_fim."),
  item("15.1", "JOIN", "JOIN com USING", "Refaça as consultas do bloco 14 usando USING no lugar de ON sempre que as colunas de ligação tiverem o mesmo nome.", ["estudante", "usuario", "turma", "disciplina"], 8),
  item("15.2", "JOIN", "Quando USING não serve", "Identifique quais consultas do bloco 14 não podem ser refeitas com USING. Escreva sua explicação como comentário SQL.", ["disciplina", "departamento"], 8),
  item("17.1", "JOIN", "Disciplinas com turmas", "Liste os nomes das disciplinas que possuem turmas.", ["disciplina", "turma"], 10),
  item("17.2", "JOIN", "Aluno e disciplina", "Liste o nome do estudante e o nome de cada disciplina das turmas que ele cursa.", ["cursa", "estudante", "usuario", "turma", "disciplina"], 10),
  item("17.3", "JOIN", "Pré-requisito revisitado", "Liste o nome da disciplina e o nome do seu pré-requisito usando autojunção.", ["disciplina"], 10),
  item("17.4", "JOIN", "Aluno e curso", "Liste o nome do estudante e o nome dos cursos aos quais ele está vinculado.", ["vinculo", "estudante", "usuario", "curso"], 10),
  item("18.1", "JOIN", "Professor, disciplina e alunos", "Para as turmas com estudantes, liste professor, disciplina e os alunos que as cursam.", ["leciona", "professor", "usuario", "turma", "disciplina", "cursa", "estudante"], 15),
  item("19.1", "JOIN", "Chefe do professor", "Liste o nome do professor e o nome do chefe do departamento a que ele pertence.", ["professor", "departamento", "usuario"], 16),
  item("19.2", "JOIN", "Orientadores ou chefes com JOIN", "Refaça a busca de professores orientadores ou chefes do item 10.1 usando junções.", ["plano", "professor", "departamento"], 16),

  item("21.1", "OUTER JOIN", "Professores sem orientandos", "Liste professores e seus orientandos, incluindo os professores que não orientam ninguém.", ["professor", "plano"], 17),
  item("21.2", "OUTER JOIN", "Alunos sem orientador", "Liste estudantes e seus orientadores, incluindo estudantes não orientados.", ["estudante", "plano"], 17),
  item("21.3", "OUTER JOIN", "Todos os dois lados", "Liste professores e estudantes, incluindo professores sem orientandos e estudantes sem orientador.", ["professor", "plano", "estudante"], 17),
  item("23.1", "OUTER JOIN", "Disciplinas que não são pré-requisito", "Liste disciplina, número da turma e professor para disciplinas que não são pré-requisito de nenhuma outra.", ["disciplina", "turma", "leciona", "professor", "usuario"], 18),
  item("23.2", "OUTER JOIN", "Alunos e orientadores", "Liste o nome de todos os alunos e o nome de seus orientadores, incluindo alunos sem orientador.", ["estudante", "usuario", "plano", "professor"], 18),
  item("23.4", "OUTER JOIN", "Professores e orientandos", "Liste o nome dos professores e de seus orientandos, incluindo professores sem orientandos.", ["professor", "usuario", "plano", "estudante"], 18),
  item("23.5", "OUTER JOIN", "Orientação completa", "Liste todos os alunos e professores, mesmo quando não exista relação de orientação.", ["estudante", "usuario", "plano", "professor"], 18),
  item("23.6", "OUTER JOIN", "Quem não leciona", "Liste os nomes dos professores que não lecionam turmas.", ["professor", "usuario", "leciona"], 19),
  item("23.7", "OUTER JOIN", "Turmas sem alunos", "Liste os nomes das disciplinas das turmas que não têm estudantes cursando.", ["turma", "cursa", "disciplina"], 19),

  item("26.1", "Agregações", "Médias gerais", "Calcule a média das notas em cursa e a média dos salários em professor.", ["cursa", "professor"], 20),
  item("26.2", "Agregações", "Somas gerais", "Refaça os cálculos anteriores usando SUM no lugar de AVG.", ["cursa", "professor"], 20),
  item("26.3", "Agregações", "Soma e média", "Em uma consulta, mostre a soma e a média das notas dos alunos.", ["cursa"], 20),
  item("26.4", "Agregações", "Quanto faltou?", "Calcule quanto faltou para cada nota abaixo de 5 atingir a aprovação.", ["cursa"], 20),
  item("26.5", "Agregações", "Mínimos e máximos", "Encontre a menor nota, a menor MC, o maior nome de usuário e a menor data de nascimento.", ["cursa", "estudante", "usuario"], 21),
  item("26.6", "Agregações", "Contagens e média ponderada", "Conte professores que orientam, calcule a média das notas com SUM/COUNT e a média ponderada por créditos.", ["plano", "cursa", "turma", "disciplina"], 21),
  item("28.1", "Agregações", "Média por aluno", "Liste a média de notas para cada estudante.", ["cursa"], 25),
  item("28.2", "Agregações", "Notas por professor", "Para cada professor, calcule a maior nota, a menor nota e a média das notas de todas as suas turmas.", ["leciona", "cursa"], 25),
  item("28.3", "Agregações", "Média das disciplinas pré-requisito", "Liste a média das notas por disciplina que serve de pré-requisito e tem notas registradas.", ["disciplina", "turma", "cursa"], 25),
  item("28.4", "Agregações", "MC por aluno", "Calcule, para cada aluno, a média ponderada das notas usando os créditos das disciplinas como peso.", ["cursa", "turma", "disciplina"], 25),
  item("31.1", "Agregações", "Pré-requisitos com notas", "Liste nome e média das notas das disciplinas que são pré-requisitos e têm notas registradas.", ["disciplina", "turma", "cursa"], 27),
  item("31.2", "Agregações", "Alunos por disciplina", "Liste nome da disciplina, código do pré-requisito e número de alunos por turma, agrupando pela disciplina.", ["disciplina", "turma", "cursa"], 27),
  item("31.3", "Agregações", "Média por departamento", "Liste o nome do departamento responsável e a média das notas de suas turmas.", ["departamento", "disciplina", "turma", "cursa"], 27),
  item("31.4", "Agregações", "Faixa salarial", "Liste o maior e o menor salário de cada departamento.", ["professor", "departamento"], 27),
  item("31.5", "Agregações", "Média no DCOMP", "Liste o nome do estudante e sua média de notas nas disciplinas do departamento DCOMP.", ["usuario", "estudante", "cursa", "turma", "disciplina"], 27, "O dump fornece usuario.nome em uma coluna, sem primeiro nome e sobrenome separados."),

  item("32.1", "Subconsultas", "Acima da média geral", "Use uma subconsulta no WHERE para listar as notas de cursa que estão acima da média de todas as notas.", ["cursa"]),
  item("32.2", "Subconsultas", "Disciplinas que são pré-requisito", "Use IN e uma subconsulta para listar as disciplinas cujo código é pré-requisito de outra disciplina.", ["disciplina"]),
  item("32.3", "Subconsultas", "Média ao lado de cada nota", "Use uma subconsulta no SELECT para mostrar cada nota junto da média daquele estudante.", ["cursa"]),
  item("32.4", "Subconsultas", "Abaixo da própria média", "Use uma subconsulta correlacionada para listar as notas abaixo da média do próprio estudante.", ["cursa"]),
  item("32.5", "Subconsultas", "Salário acima da média do departamento", "Use uma subconsulta correlacionada para listar os professores cujo salário é maior que a média do departamento a que pertencem.", ["professor"]),
  item("32.6", "Subconsultas", "Disciplinas sem turmas", "Use NOT EXISTS para listar as disciplinas que não têm nenhuma turma cadastrada.", ["disciplina", "turma"]),

  item("33.1", "CTEs", "Médias por estudante com WITH", "Use WITH para calcular a média de cada estudante e, na consulta principal, liste quem ficou acima de 7.", ["cursa"]),
  item("33.2", "CTEs", "Turmas acima da média geral", "Use duas CTEs: uma para calcular a média de cada turma e outra para calcular a média geral das notas. Liste as turmas cuja média ficou acima da geral.", ["cursa"]),
  item("33.3", "CTEs", "Média por departamento com WITH", "Use uma CTE para reunir notas, turmas, disciplinas e departamentos. Depois, mostre a média das notas por departamento.", ["departamento", "disciplina", "turma", "cursa"]),

  item("36.1", "CTEs", "Médias de professores por departamento com WITH", "Reescreva usando WITH a consulta que lista os professores cuja média de notas é menor que a média do departamento.", ["leciona", "turma", "cursa", "professor"], 31, undefined, "PDF VFinal"),
  item("37.1", "CTEs", "Médias de professores abaixo da média do departamento", "Use WITH para listar os professores cuja média de notas é menor que a média de notas dos professores do mesmo departamento.", ["leciona", "turma", "cursa", "professor"], 31, undefined, "PDF VFinal"),
  item("37.2", "Subconsultas", "Menor média salarial entre departamentos", "Liste a menor média salarial entre todos os departamentos.", ["professor"], 31, undefined, "PDF VFinal"),
  item("37.3", "CTEs", "Médias de estudantes e cursos", "Liste a matrícula do estudante, sua média de notas, o nome do curso e a média de notas dos estudantes desse curso.", ["cursa", "estudante", "vinculo", "curso"], 32, undefined, "PDF VFinal"),

  item("44.1", "Subconsultas", "Orientandos de P200 em turmas de P500", "Liste as matrículas dos estudantes orientados por P200 que cursam alguma turma lecionada por P500.", ["plano", "cursa", "turma", "leciona"], 35, undefined, "PDF VFinal"),
  item("44.2", "Subconsultas", "Professores sem orientandos ou chefes", "Liste as matrículas dos professores que não orientam estudantes ou que são chefes de algum departamento.", ["professor", "plano", "departamento"], 36, undefined, "PDF VFinal"),
  item("44.3", "Subconsultas", "Professores orientadores que são chefes", "Liste, sem repetições, as matrículas dos professores que orientam estudantes e também chefiam algum departamento.", ["plano", "departamento"], 36, undefined, "PDF VFinal"),
  item("44.4", "Subconsultas", "Professores que não orientam nem são chefes", "Liste as matrículas dos professores que não orientam estudantes e não são chefes de departamento.", ["professor", "plano", "departamento"], 36, undefined, "PDF VFinal"),
  item("44.5", "CTEs", "Departamento com menor média salarial", "Use uma CTE para calcular a média salarial de cada departamento e liste o código do departamento com a menor média.", ["professor"], 36, undefined, "PDF VFinal"),
  item("44.6", "Subconsultas", "Professores com o menor salário", "Liste os nomes dos professores que recebem o menor salário.", ["professor", "usuario"], 36, undefined, "PDF VFinal"),
  item("44.7", "CTEs", "Estudante com a menor média de notas", "Use uma CTE para calcular a média das notas não nulas de cada estudante e liste o nome de quem tem a menor média.", ["cursa", "estudante", "usuario"], 37, undefined, "PDF VFinal"),
  item("44.8", "Subconsultas", "Notas aprovadas e abaixo de 5 por estudante", "Liste o nome de cada estudante, quantas notas são maiores ou iguais a 5 e quantas são menores que 5.", ["estudante", "cursa", "usuario"], 37, undefined, "PDF VFinal"),
  item("44.9", "CTEs", "Disciplinas abaixo da média do departamento", "Usando uma CTE e uma subconsulta correlacionada no WHERE, liste o nome e a média das disciplinas cuja média é menor que a média das notas das disciplinas do mesmo departamento.", ["cursa", "turma", "disciplina"], 37, undefined, "PDF VFinal"),
  item("44.10", "CTEs", "Comparar médias usando consultas no FROM", "Refaça o exercício 44.9 usando consultas aninhadas no FROM para calcular as médias por disciplina e por departamento.", ["cursa", "turma", "disciplina"], 38, undefined, "PDF VFinal"),
];
