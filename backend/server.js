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
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ empresas: [], funcionarios: [], registros: [] }, null, 2));
  }
  const dados = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!dados.empresas) dados.empresas = [];
  return dados;
}

function salvarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

function formatarHHMM(totalMin) {
  const neg = totalMin < 0;
  const abs = Math.abs(totalMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return (neg ? '-' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// ── Empresas ────────────────────────────────────────────────────────────────

app.get('/api/empresas', (req, res) => {
  const dados = lerDados();
  res.json(dados.empresas);
});

app.get('/api/empresas/:id', (req, res) => {
  const dados = lerDados();
  const empresa = dados.empresas.find(e => e.id === req.params.id);
  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
  res.json(empresa);
});

app.post('/api/empresas', (req, res) => {
  const { nome, cnpj, codigo } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
  if (!cnpj?.trim()) return res.status(400).json({ erro: 'CNPJ é obrigatório' });
  if (!codigo?.trim()) return res.status(400).json({ erro: 'Código é obrigatório' });

  const dados = lerDados();

  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (dados.empresas.find(e => e.cnpj.replace(/\D/g, '') === cnpjLimpo)) {
    return res.status(409).json({ erro: 'Já existe uma empresa com este CNPJ' });
  }
  if (dados.empresas.find(e => e.codigo.toLowerCase() === codigo.trim().toLowerCase())) {
    return res.status(409).json({ erro: 'Já existe uma empresa com este código' });
  }

  const empresa = {
    id: uuidv4(),
    nome: nome.trim(),
    cnpj: cnpj.trim(),
    codigo: codigo.trim().toUpperCase(),
    criadoEm: new Date().toISOString(),
  };
  dados.empresas.push(empresa);
  salvarDados(dados);
  res.status(201).json(empresa);
});

app.put('/api/empresas/:id', (req, res) => {
  const { nome, cnpj, codigo } = req.body;
  const dados = lerDados();
  const idx = dados.empresas.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Empresa não encontrada' });

  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
  if (!cnpj?.trim()) return res.status(400).json({ erro: 'CNPJ é obrigatório' });
  if (!codigo?.trim()) return res.status(400).json({ erro: 'Código é obrigatório' });

  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const duplicadoCnpj = dados.empresas.find(e => e.cnpj.replace(/\D/g, '') === cnpjLimpo && e.id !== req.params.id);
  if (duplicadoCnpj) return res.status(409).json({ erro: 'Já existe outra empresa com este CNPJ' });

  const duplicadoCodigo = dados.empresas.find(e => e.codigo.toLowerCase() === codigo.trim().toLowerCase() && e.id !== req.params.id);
  if (duplicadoCodigo) return res.status(409).json({ erro: 'Já existe outra empresa com este código' });

  dados.empresas[idx] = { ...dados.empresas[idx], nome: nome.trim(), cnpj: cnpj.trim(), codigo: codigo.trim().toUpperCase() };
  salvarDados(dados);
  res.json(dados.empresas[idx]);
});

app.delete('/api/empresas/:id', (req, res) => {
  const dados = lerDados();
  const idx = dados.empresas.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Empresa não encontrada' });
  dados.empresas.splice(idx, 1);
  dados.funcionarios = dados.funcionarios.filter(f => f.empresaId !== req.params.id);
  dados.registros = dados.registros.filter(r => r.empresaId !== req.params.id);
  salvarDados(dados);
  res.json({ mensagem: 'Empresa removida' });
});

// ── Funcionários ─────────────────────────────────────────────────────────────

app.get('/api/funcionarios', (req, res) => {
  const { empresaId } = req.query;
  const dados = lerDados();
  const lista = empresaId
    ? dados.funcionarios.filter(f => f.empresaId === empresaId)
    : dados.funcionarios;
  res.json(lista);
});

app.post('/api/funcionarios', (req, res) => {
  const { nome, matricula, empresaId } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
  if (!empresaId) return res.status(400).json({ erro: 'empresaId é obrigatório' });

  const dados = lerDados();
  if (!dados.empresas.find(e => e.id === empresaId)) {
    return res.status(404).json({ erro: 'Empresa não encontrada' });
  }

  const funcionario = {
    id: uuidv4(),
    empresaId,
    nome: nome.trim(),
    matricula: matricula?.trim() || '',
    criadoEm: new Date().toISOString(),
  };
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

// ── Registros ─────────────────────────────────────────────────────────────────

app.get('/api/registros', (req, res) => {
  const { empresaId } = req.query;
  const dados = lerDados();
  let lista = dados.registros;
  if (empresaId) lista = lista.filter(r => r.empresaId === empresaId);
  const registros = lista.map(r => {
    const func = dados.funcionarios.find(f => f.id === r.funcionarioId);
    const empresa = dados.empresas.find(e => e.id === r.empresaId);
    return { ...r, nomeFuncionario: func?.nome || 'Desconhecido', matricula: func?.matricula || '', nomeEmpresa: empresa?.nome || '' };
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
  const { funcionarioId, empresaId, semestre, ano, minutos } = req.body;
  if (!funcionarioId || !empresaId || !semestre || !ano || !minutos) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }
  const dados = lerDados();
  const func = dados.funcionarios.find(f => f.id === funcionarioId);
  if (!func) return res.status(404).json({ erro: 'Funcionário não encontrado' });

  const meses = MESES_SEMESTRE[semestre];
  const minutosValidos = {};
  meses.forEach(mes => { minutosValidos[mes] = Math.round(Number(minutos[mes])) || 0; });
  const totalMinutos = Object.values(minutosValidos).reduce((acc, m) => acc + m, 0);

  const duplicado = dados.registros.find(r =>
    r.funcionarioId === funcionarioId && r.semestre === Number(semestre) && r.ano === Number(ano)
  );
  if (duplicado) {
    return res.status(409).json({ erro: `Já existe registro para ${func.nome} no ${semestre}º semestre de ${ano}` });
  }

  const registro = {
    id: uuidv4(),
    empresaId,
    funcionarioId,
    semestre: Number(semestre),
    ano: Number(ano),
    minutos: minutosValidos,
    totalMinutos,
    resultado: totalMinutos >= 0 ? 'positivo' : 'negativo',
    criadoEm: new Date().toISOString(),
  };
  dados.registros.push(registro);
  salvarDados(dados);
  res.status(201).json({ ...registro, nomeFuncionario: func.nome, matricula: func.matricula });
});

app.put('/api/registros/:id', (req, res) => {
  const { minutos } = req.body;
  const dados = lerDados();
  const idx = dados.registros.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Registro não encontrado' });

  const registro = dados.registros[idx];
  const meses = MESES_SEMESTRE[registro.semestre];
  const minutosValidos = {};
  meses.forEach(mes => { minutosValidos[mes] = Math.round(Number(minutos[mes])) || 0; });
  const totalMinutos = Object.values(minutosValidos).reduce((acc, m) => acc + m, 0);

  dados.registros[idx] = { ...registro, minutos: minutosValidos, totalMinutos, resultado: totalMinutos >= 0 ? 'positivo' : 'negativo' };
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

// ── Exportar Excel individual ─────────────────────────────────────────────────

app.get('/api/exportar/:id', async (req, res) => {
  const dados = lerDados();
  const registro = dados.registros.find(r => r.id === req.params.id);
  if (!registro) return res.status(404).json({ erro: 'Registro não encontrado' });

  const func = dados.funcionarios.find(f => f.id === registro.funcionarioId);
  const empresa = dados.empresas.find(e => e.id === registro.empresaId);
  const nomeFuncionario = func?.nome || 'Desconhecido';
  const matricula = func?.matricula || '';
  const nomeEmpresa = empresa?.nome || '';
  const cnpjEmpresa = empresa?.cnpj || '';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contador HorasDP';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Horas Semestrais');

  const corHeader   = '1F3A5F';
  const corSubHeader = '2E6DA4';
  const corPositivo = 'D4EDDA';
  const corNegativo = 'F8D7DA';
  const corAlternada = 'EBF3FB';

  const bordaThin = {
    top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
    left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
    bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
    right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
  };

  const aplicarHeader = (cell, texto, fgColor, fontSize = 11) => {
    cell.value = texto;
    cell.font = { bold: true, size: fontSize, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = bordaThin;
  };

  sheet.mergeCells('A1:C1');
  aplicarHeader(sheet.getCell('A1'), 'CONTADOR DE HORAS SEMESTRAIS - DEPARTAMENTO PESSOAL', corHeader, 14);
  sheet.getRow(1).height = 36;

  sheet.addRow([]);

  const infoRows = [
    ['Empresa', nomeEmpresa],
    ['CNPJ', cnpjEmpresa],
    ['Funcionário', nomeFuncionario],
    ['Matrícula', matricula || '—'],
    ['Semestre', `${registro.semestre}º Semestre de ${registro.ano}`],
  ];
  infoRows.forEach(([label, valor]) => {
    const row = sheet.addRow([label, valor]);
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4F8' } };
    row.getCell(2).font = { size: 11 };
    row.height = 22;
  });

  sheet.addRow([]);

  const headerRow = sheet.addRow(['Mês', 'Horas (HH:MM)', 'Observação']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corSubHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = bordaThin;
  });
  headerRow.height = 28;

  MESES_SEMESTRE[registro.semestre].forEach((mes, i) => {
    const min = registro.minutos[mes] || 0;
    const obs = min > 0 ? 'Crédito' : min < 0 ? 'Débito' : 'Neutro';
    const row = sheet.addRow([mes, formatarHHMM(min), obs]);
    const bg = i % 2 === 0 ? 'FFFFFFFF' : corAlternada;
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = bordaThin;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.height = 22;
  });

  sheet.addRow([]);

  const corTotal = registro.resultado === 'positivo' ? corPositivo : corNegativo;
  const totalRow = sheet.addRow(['TOTAL DE HORAS', formatarHHMM(registro.totalMinutos), registro.resultado === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo']);
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corTotal } };
    cell.font = { bold: true, size: 12 };
    cell.border = bordaThin;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  totalRow.height = 28;

  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 22;

  const nomeArquivo = `horas_${nomeFuncionario.replace(/\s+/g, '_')}_${registro.semestre}S${registro.ano}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  await workbook.xlsx.write(res);
  res.end();
});

// ── Exportar todos (por empresa, com filtros opcionais de semestre e ano) ──────

app.get('/api/exportar-todos', async (req, res) => {
  const { empresaId } = req.query;
  const semestreFiltro = req.query.semestre ? Number(req.query.semestre) : null;
  const anoFiltro = req.query.ano ? Number(req.query.ano) : null;

  const dados = lerDados();
  let lista = dados.registros;
  if (empresaId) lista = lista.filter(r => r.empresaId === empresaId);
  if (semestreFiltro) lista = lista.filter(r => r.semestre === semestreFiltro);
  if (anoFiltro) lista = lista.filter(r => r.ano === anoFiltro);
  if (lista.length === 0) return res.status(404).json({ erro: 'Nenhum registro encontrado para os filtros aplicados' });

  const mesesHeader = semestreFiltro ? MESES_SEMESTRE[semestreFiltro] : MESES_SEMESTRE[1];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contador HorasDP';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Registros de Horas');
  const corHeader = '1F3A5F';

  const headerRow = sheet.addRow(['Empresa', 'Funcionário', 'Matrícula', 'Semestre', 'Ano',
    ...mesesHeader, 'Total', 'Resultado']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 28;

  lista.forEach((r, i) => {
    const func = dados.funcionarios.find(f => f.id === r.funcionarioId);
    const empresa = dados.empresas.find(e => e.id === r.empresaId);
    const meses = MESES_SEMESTRE[r.semestre];
    const row = sheet.addRow([
      empresa?.nome || '',
      func?.nome || '',
      func?.matricula || '',
      `${r.semestre}º Semestre`,
      r.ano,
      ...meses.map(m => formatarHHMM(r.minutos?.[m] || 0)),
      formatarHHMM(r.totalMinutos || 0),
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
  sheet.getColumn(2).width = 28;

  const sufixo = [semestreFiltro ? `${semestreFiltro}S` : '', anoFiltro || ''].filter(Boolean).join('_');
  const nomeArquivo = `registros_horas${sufixo ? `_${sufixo}` : ''}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  await workbook.xlsx.write(res);
  res.end();
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
