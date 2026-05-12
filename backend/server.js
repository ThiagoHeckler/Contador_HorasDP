const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'registros.json');

app.use(cors());
app.use(express.json());

const MESES_SEMESTRE = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
};

function lerDados() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ funcionarios: [], registros: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function salvarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

// Funcionários
app.get('/api/funcionarios', (req, res) => {
  const dados = lerDados();
  res.json(dados.funcionarios);
});

app.post('/api/funcionarios', (req, res) => {
  const { nome, matricula } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }
  const dados = lerDados();
  const funcionario = { id: uuidv4(), nome: nome.trim(), matricula: matricula?.trim() || '', criadoEm: new Date().toISOString() };
  dados.funcionarios.push(funcionario);
  salvarDados(dados);
  res.status(201).json(funcionario);
});

app.delete('/api/funcionarios/:id', (req, res) => {
  const dados = lerDados();
  const idx = dados.funcionarios.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Funcionário não encontrado' });
  dados.funcionarios.splice(idx, 1);
  dados.registros = dados.registros.filter(r => r.funcionarioId !== req.params.id);
  salvarDados(dados);
  res.json({ mensagem: 'Funcionário removido' });
});

// Registros de horas
app.get('/api/registros', (req, res) => {
  const dados = lerDados();
  const registros = dados.registros.map(r => {
    const func = dados.funcionarios.find(f => f.id === r.funcionarioId);
    return { ...r, nomeFuncionario: func?.nome || 'Desconhecido', matricula: func?.matricula || '' };
  });
  res.json(registros);
});

app.get('/api/registros/:id', (req, res) => {
  const dados = lerDados();
  const registro = dados.registros.find(r => r.id === req.params.id);
  if (!registro) return res.status(404).json({ erro: 'Registro não encontrado' });
  const func = dados.funcionarios.find(f => f.id === registro.funcionarioId);
  res.json({ ...registro, nomeFuncionario: func?.nome || '', matricula: func?.matricula || '' });
});

app.post('/api/registros', (req, res) => {
  const { funcionarioId, semestre, ano, horas } = req.body;
  if (!funcionarioId || !semestre || !ano || !horas) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }
  const dados = lerDados();
  const func = dados.funcionarios.find(f => f.id === funcionarioId);
  if (!func) return res.status(404).json({ erro: 'Funcionário não encontrado' });

  const meses = MESES_SEMESTRE[semestre];
  const horasValidas = {};
  meses.forEach(mes => { horasValidas[mes] = Number(horas[mes]) || 0; });

  const totalHoras = Object.values(horasValidas).reduce((acc, h) => acc + h, 0);

  const duplicado = dados.registros.find(r => r.funcionarioId === funcionarioId && r.semestre === Number(semestre) && r.ano === Number(ano));
  if (duplicado) {
    return res.status(409).json({ erro: `Já existe registro para ${func.nome} no ${semestre}º semestre de ${ano}` });
  }

  const registro = {
    id: uuidv4(),
    funcionarioId,
    semestre: Number(semestre),
    ano: Number(ano),
    horas: horasValidas,
    totalHoras,
    resultado: totalHoras >= 0 ? 'positivo' : 'negativo',
    criadoEm: new Date().toISOString(),
  };
  dados.registros.push(registro);
  salvarDados(dados);
  res.status(201).json({ ...registro, nomeFuncionario: func.nome, matricula: func.matricula });
});

app.put('/api/registros/:id', (req, res) => {
  const { horas } = req.body;
  const dados = lerDados();
  const idx = dados.registros.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Registro não encontrado' });

  const registro = dados.registros[idx];
  const meses = MESES_SEMESTRE[registro.semestre];
  const horasValidas = {};
  meses.forEach(mes => { horasValidas[mes] = Number(horas[mes]) || 0; });
  const totalHoras = Object.values(horasValidas).reduce((acc, h) => acc + h, 0);

  dados.registros[idx] = { ...registro, horas: horasValidas, totalHoras, resultado: totalHoras >= 0 ? 'positivo' : 'negativo' };
  salvarDados(dados);

  const func = dados.funcionarios.find(f => f.id === registro.funcionarioId);
  res.json({ ...dados.registros[idx], nomeFuncionario: func?.nome || '', matricula: func?.matricula || '' });
});

app.delete('/api/registros/:id', (req, res) => {
  const dados = lerDados();
  const idx = dados.registros.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Registro não encontrado' });
  dados.registros.splice(idx, 1);
  salvarDados(dados);
  res.json({ mensagem: 'Registro removido' });
});

// Exportar Excel
app.get('/api/exportar/:id', async (req, res) => {
  const dados = lerDados();
  const registro = dados.registros.find(r => r.id === req.params.id);
  if (!registro) return res.status(404).json({ erro: 'Registro não encontrado' });

  const func = dados.funcionarios.find(f => f.id === registro.funcionarioId);
  const nomeFuncionario = func?.nome || 'Desconhecido';
  const matricula = func?.matricula || '';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contador HorasDP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Horas Semestrais');

  const corHeader = '1F3A5F';
  const corSubHeader = '2E6DA4';
  const corPositivo = 'D4EDDA';
  const corNegativo = 'F8D7DA';
  const corAlternada = 'EBF3FB';

  const estilo = (bold, size, cor, fgColor) => ({
    font: { bold, size: size || 11, color: { argb: cor || 'FF000000' } },
    fill: fgColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } } : undefined,
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
    },
  });

  sheet.mergeCells('A1:C1');
  const titulo = sheet.getCell('A1');
  titulo.value = 'CONTADOR DE HORAS SEMESTRAIS - DEPARTAMENTO PESSOAL';
  Object.assign(titulo, estilo(true, 14, 'FFFFFFFF', corHeader));

  sheet.getRow(1).height = 36;

  sheet.addRow([]);

  const dadosFuncionario = [
    ['Funcionário', nomeFuncionario],
    ['Matrícula', matricula || '—'],
    ['Semestre', `${registro.semestre}º Semestre de ${registro.ano}`],
  ];

  dadosFuncionario.forEach(([label, valor]) => {
    const row = sheet.addRow([label, valor]);
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4F8' } };
    row.getCell(2).font = { size: 11 };
    row.height = 22;
  });

  sheet.addRow([]);

  const headerRow = sheet.addRow(['Mês', 'Horas', 'Observação']);
  headerRow.eachCell(cell => {
    Object.assign(cell, estilo(true, 12, 'FFFFFFFF', corSubHeader));
  });
  headerRow.height = 28;

  const meses = MESES_SEMESTRE[registro.semestre];
  meses.forEach((mes, i) => {
    const horas = registro.horas[mes] || 0;
    const obs = horas > 0 ? 'Crédito' : horas < 0 ? 'Débito' : 'Neutro';
    const row = sheet.addRow([mes, horas, obs]);
    const bg = i % 2 === 0 ? 'FFFFFFFF' : corAlternada;
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = estilo(false).border;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.height = 22;
  });

  sheet.addRow([]);

  const totalRow = sheet.addRow(['TOTAL DE HORAS', registro.totalHoras, registro.resultado === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo']);
  const corTotal = registro.resultado === 'positivo' ? corPositivo : corNegativo;
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corTotal.replace('#', '') } };
    cell.font = { bold: true, size: 12 };
    cell.border = estilo(false).border;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  totalRow.height = 28;

  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 22;

  const nomeArquivo = `horas_${nomeFuncionario.replace(/\s+/g, '_')}_${registro.semestre}S${registro.ano}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

  await workbook.xlsx.write(res);
  res.end();
});

// Exportar todos os registros em um único Excel
app.get('/api/exportar-todos', async (req, res) => {
  const dados = lerDados();
  if (dados.registros.length === 0) return res.status(404).json({ erro: 'Nenhum registro encontrado' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contador HorasDP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Todos os Registros');
  const corHeader = '1F3A5F';

  const headerRow = sheet.addRow(['Funcionário', 'Matrícula', 'Semestre', 'Ano', ...Object.values(MESES_SEMESTRE).flat().slice(0, 6), 'Total', 'Resultado']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 28;

  dados.registros.forEach((r, i) => {
    const func = dados.funcionarios.find(f => f.id === r.funcionarioId);
    const meses = MESES_SEMESTRE[r.semestre];
    const horasMeses = meses.map(m => r.horas[m] || 0);
    const row = sheet.addRow([
      func?.nome || '',
      func?.matricula || '',
      `${r.semestre}º Semestre`,
      r.ano,
      ...horasMeses,
      r.totalHoras,
      r.resultado === 'positivo' ? 'Positivo' : 'Negativo',
    ]);
    const bg = i % 2 === 0 ? 'FFFFFFFF' : 'EBF3FB';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFBDBDBD' } }, left: { style: 'thin', color: { argb: 'FFBDBDBD' } }, bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } }, right: { style: 'thin', color: { argb: 'FFBDBDBD' } } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    row.height = 22;
  });

  sheet.columns.forEach(col => { col.width = 18; });
  sheet.getColumn(1).width = 28;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="todos_registros_horas.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
