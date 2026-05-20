import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFuncionarios, criarRegistro, atualizarRegistro, buscarRegistro } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

const TODOS_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const MESES_SEM = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 6 }, (_, i) => anoAtual - 2 + i)

function semestreDoMes(mes) {
  return TODOS_MESES.indexOf(mes) < 6 ? 1 : 2
}

export function formatarHHMM(totalMin) {
  const neg = totalMin < 0
  const abs = Math.abs(totalMin)
  return (neg ? '-' : '') + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0')
}

function clampMin(v) {
  const n = parseInt(v); return isNaN(n) ? '' : String(Math.min(59, Math.max(0, n)))
}

// ── Estado inicial ──────────────────────────────────────────────────────────

function estadoSimplesInicial() { return { tipo: 'credito', horas: '', minutos: '' } }
function estadosSimplesIniciais(sem) { return Object.fromEntries(MESES_SEM[sem].map(m => [m, estadoSimplesInicial()])) }
function simplesParaMinutos(e) {
  const t = (parseInt(e.horas) || 0) * 60 + (parseInt(e.minutos) || 0)
  return e.tipo === 'debito' ? -t : t
}

function estadoCompletoInicial() { return { credHoras: '', credMinutos: '', debHoras: '', debMinutos: '' } }
function completoParaMinutos(e) {
  return ((parseInt(e.credHoras) || 0) * 60 + (parseInt(e.credMinutos) || 0))
    - ((parseInt(e.debHoras) || 0) * 60 + (parseInt(e.debMinutos) || 0))
}

// ── Card simples ────────────────────────────────────────────────────────────

function MesCardSimples({ mes, est, onChange }) {
  const min = simplesParaMinutos(est)
  return (
    <div className={`mes-card ${est.tipo}`}>
      <div className="mes-nome">{mes}</div>
      <div className="mes-tipo-toggle">
        <button type="button" className={`tipo-btn credito${est.tipo === 'credito' ? ' ativo' : ''}`}
          onClick={() => onChange('tipo', 'credito')}>+ Crédito</button>
        <button type="button" className={`tipo-btn debito${est.tipo === 'debito' ? ' ativo' : ''}`}
          onClick={() => onChange('tipo', 'debito')}>− Débito</button>
      </div>
      <div className="mes-inputs">
        <div className="form-group"><label>Horas</label>
          <input type="number" min="0" placeholder="00" value={est.horas}
            onChange={e => onChange('horas', e.target.value)} /></div>
        <span className="sep-hhmm">:</span>
        <div className="form-group"><label>Min</label>
          <input type="number" min="0" max="59" placeholder="00" value={est.minutos}
            onChange={e => onChange('minutos', clampMin(e.target.value))} /></div>
      </div>
      <div className={`mes-total ${est.tipo}`}>
        {min !== 0 ? (est.tipo === 'debito' ? '-' : '+') : ''}{formatarHHMM(Math.abs(min))}
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function Lancamento() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const modo = empresa.tipoLancamento === 'completo' ? 'completo' : 'simples'

  const [funcionarios, setFuncionarios] = useState([])
  const [loadingFunc, setLoadingFunc] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // ── Estado modo simples
  const [formS, setFormS] = useState({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })
  const [estadosS, setEstadosS] = useState(estadosSimplesIniciais(1))

  // ── Estado modo completo
  const [formC, setFormC] = useState({
    funcionarioId: '',
    mes: TODOS_MESES[new Date().getMonth()],
    ano: String(anoAtual),
  })
  const [estC, setEstC] = useState(estadoCompletoInicial())
  const [registroExistente, setRegistroExistente] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const buscaRef = useRef(0)

  useEffect(() => {
    getFuncionarios(empresa.id)
      .then(setFuncionarios)
      .catch(e => setErro(e.message))
      .finally(() => setLoadingFunc(false))
  }, [empresa.id])

  // Quando funcionário/mês/ano mudar no modo completo, busca registro existente
  useEffect(() => {
    if (modo !== 'completo') return
    const { funcionarioId, mes, ano } = formC
    if (!funcionarioId) { setEstC(estadoCompletoInicial()); setRegistroExistente(null); return }

    const sem = semestreDoMes(mes)
    const token = ++buscaRef.current
    setBuscando(true)
    setErro('')

    buscarRegistro({ empresaId: empresa.id, funcionarioId, semestre: sem, ano })
      .then(reg => {
        if (token !== buscaRef.current) return
        setRegistroExistente(reg)
        const minAtual = reg.minutos?.[mes] ?? 0
        // Pre-preenche crédito e débito a partir do valor líquido salvo
        if (minAtual >= 0) {
          const h = Math.floor(minAtual / 60), m = minAtual % 60
          setEstC({ credHoras: String(h), credMinutos: String(m), debHoras: '', debMinutos: '' })
        } else {
          const abs = Math.abs(minAtual)
          const h = Math.floor(abs / 60), m = abs % 60
          setEstC({ credHoras: '', credMinutos: '', debHoras: String(h), debMinutos: String(m) })
        }
      })
      .catch(() => {
        if (token !== buscaRef.current) return
        setRegistroExistente(null)
        setEstC(estadoCompletoInicial())
      })
      .finally(() => { if (token === buscaRef.current) setBuscando(false) })
  }, [formC.funcionarioId, formC.mes, formC.ano, modo, empresa.id])

  // ── Salvar simples
  async function salvarSimples(e) {
    e.preventDefault()
    setErro('')
    if (!formS.funcionarioId) { setErro('Selecione um funcionário.'); return }
    const sem = Number(formS.semestre)
    const mesesAtivos = MESES_SEM[sem]
    const minutos = Object.fromEntries(mesesAtivos.map(m => [m, simplesParaMinutos(estadosS[m])]))
    setSalvando(true)
    try {
      await criarRegistro({ funcionarioId: formS.funcionarioId, empresaId: empresa.id, semestre: sem, ano: Number(formS.ano), minutos })
      navigate('/registros')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  function limparSimples() {
    const sem = Number(formS.semestre)
    setFormS(p => ({ ...p, funcionarioId: '' }))
    setEstadosS(estadosSimplesIniciais(sem))
    setErro('')
  }

  function handleSemestreSimples(e) {
    const sem = Number(e.target.value)
    setFormS(p => ({ ...p, semestre: String(sem) }))
    setEstadosS(estadosSimplesIniciais(sem))
  }

  // ── Salvar completo
  async function salvarCompleto(e) {
    e.preventDefault()
    setErro('')
    if (!formC.funcionarioId) { setErro('Selecione um funcionário.'); return }
    const sem = semestreDoMes(formC.mes)
    const novoMin = completoParaMinutos(estC)

    setSalvando(true)
    try {
      if (registroExistente) {
        // Atualiza apenas o mês selecionado, mantendo os demais
        const minutosAtualizados = { ...registroExistente.minutos, [formC.mes]: novoMin }
        await atualizarRegistro(registroExistente.id, { minutos: minutosAtualizados })
      } else {
        // Cria novo registro com zeros nos outros meses
        const minutos = Object.fromEntries(MESES_SEM[sem].map(m => [m, m === formC.mes ? novoMin : 0]))
        await criarRegistro({ funcionarioId: formC.funcionarioId, empresaId: empresa.id, semestre: sem, ano: Number(formC.ano), minutos })
      }
      navigate('/registros')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  function limparCompleto() {
    setEstC(estadoCompletoInicial())
    setErro('')
  }

  // ── Cálculos completo
  const credMin = (parseInt(estC.credHoras) || 0) * 60 + (parseInt(estC.credMinutos) || 0)
  const debMin  = (parseInt(estC.debHoras)  || 0) * 60 + (parseInt(estC.debMinutos)  || 0)
  const saldoC  = credMin - debMin
  const resC    = saldoC >= 0 ? 'positivo' : 'negativo'

  // ── Cálculos simples
  const mesesAtivosS = MESES_SEM[Number(formS.semestre)]
  const totalMinS = mesesAtivosS.reduce((acc, m) => acc + simplesParaMinutos(estadosS[m]), 0)
  const resS = totalMinS >= 0 ? 'positivo' : 'negativo'

  // ── Render ──────────────────────────────────────────────────────────────────

  if (modo === 'simples') return (
    <div>
      <div className="page-title">📋 Lançamento de Horas</div>
      <form onSubmit={salvarSimples}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Dados do Lançamento</div>
          {erro && <div className="alert alert-error">⚠ {erro}</div>}
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="s-func">Funcionário *</label>
              {loadingFunc ? <input disabled placeholder="Carregando…" /> : (
                <select id="s-func" value={formS.funcionarioId}
                  onChange={e => setFormS(p => ({ ...p, funcionarioId: e.target.value }))}>
                  <option value="">Selecione um funcionário…</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}{f.matricula ? ` — ${f.matricula}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="s-sem">Semestre *</label>
              <select id="s-sem" value={formS.semestre} onChange={handleSemestreSimples}>
                <option value="1">1º Semestre (Jan – Jun)</option>
                <option value="2">2º Semestre (Jul – Dez)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="s-ano">Ano *</label>
              <select id="s-ano" value={formS.ano} onChange={e => setFormS(p => ({ ...p, ano: e.target.value }))}>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Horas por Mês</div>
          <div className="horas-grid-lancamento">
            {mesesAtivosS.map(mes => (
              <MesCardSimples key={mes} mes={mes} est={estadosS[mes]}
                onChange={(campo, valor) => setEstadosS(p => ({ ...p, [mes]: { ...p[mes], [campo]: valor } }))} />
            ))}
          </div>
          <div className={`resultado-box ${resS}`}>
            <div>
              <div className="resultado-label">Total Semestral</div>
              <div className="resultado-valor">{formatarHHMM(totalMinS)}</div>
            </div>
            <span className={`badge badge-${resS}`} style={{ fontSize: '0.88rem', padding: '0.4rem 1rem' }}>
              {resS === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo'}
            </span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : '💾 Salvar Lançamento'}
          </button>
          <button type="button" className="btn-ghost" onClick={limparSimples}>Limpar</button>
        </div>
      </form>
    </div>
  )

  // ── Modo completo ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-title">📋 Lançamento de Horas</div>
      <form onSubmit={salvarCompleto}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Dados do Lançamento</div>
          {erro && <div className="alert alert-error">⚠ {erro}</div>}
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label htmlFor="c-func">Funcionário *</label>
              {loadingFunc ? <input disabled placeholder="Carregando…" /> : (
                <select id="c-func" value={formC.funcionarioId}
                  onChange={e => setFormC(p => ({ ...p, funcionarioId: e.target.value }))}>
                  <option value="">Selecione um funcionário…</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}{f.matricula ? ` — ${f.matricula}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="c-mes">Mês *</label>
              <select id="c-mes" value={formC.mes}
                onChange={e => setFormC(p => ({ ...p, mes: e.target.value }))}>
                {TODOS_MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="c-ano">Ano *</label>
              <select id="c-ano" value={formC.ano}
                onChange={e => setFormC(p => ({ ...p, ano: e.target.value }))}>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          {registroExistente && (
            <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>
              ✔ Registro do {semestreDoMes(formC.mes)}º semestre já existe — este lançamento atualizará apenas o mês de {formC.mes}.
            </div>
          )}
        </div>

        <div className="card lancamento-completo-card">
          <div className="card-title" style={{ marginBottom: '1.25rem' }}>
            {formC.mes} / {formC.ano}
            {buscando && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--cinza-400)', marginLeft: '0.75rem' }}>verificando…</span>}
          </div>

          <div className="lancamento-completo-linhas">
            {/* Crédito */}
            <div className="lancamento-completo-bloco credito-bloco">
              <div className="lcb-titulo credito-titulo">+ Crédito</div>
              <div className="mes-inputs">
                <div className="form-group">
                  <label>Horas</label>
                  <input type="number" min="0" placeholder="00" value={estC.credHoras}
                    onChange={e => setEstC(p => ({ ...p, credHoras: e.target.value }))} />
                </div>
                <span className="sep-hhmm">:</span>
                <div className="form-group">
                  <label>Min</label>
                  <input type="number" min="0" max="59" placeholder="00" value={estC.credMinutos}
                    onChange={e => setEstC(p => ({ ...p, credMinutos: clampMin(e.target.value) }))} />
                </div>
              </div>
              <div className="lcb-subtotal credito-sub">{formatarHHMM(credMin)}</div>
            </div>

            <div className="lcb-separador">−</div>

            {/* Débito */}
            <div className="lancamento-completo-bloco debito-bloco">
              <div className="lcb-titulo debito-titulo">− Débito</div>
              <div className="mes-inputs">
                <div className="form-group">
                  <label>Horas</label>
                  <input type="number" min="0" placeholder="00" value={estC.debHoras}
                    onChange={e => setEstC(p => ({ ...p, debHoras: e.target.value }))} />
                </div>
                <span className="sep-hhmm">:</span>
                <div className="form-group">
                  <label>Min</label>
                  <input type="number" min="0" max="59" placeholder="00" value={estC.debMinutos}
                    onChange={e => setEstC(p => ({ ...p, debMinutos: clampMin(e.target.value) }))} />
                </div>
              </div>
              <div className="lcb-subtotal debito-sub">{formatarHHMM(debMin)}</div>
            </div>
          </div>

          <div className={`resultado-box ${resC}`} style={{ marginTop: '1.25rem' }}>
            <div>
              <div className="resultado-label">Resultado do Mês</div>
              <div className="resultado-valor">{formatarHHMM(saldoC)}</div>
            </div>
            <span className={`badge badge-${resC}`} style={{ fontSize: '0.88rem', padding: '0.4rem 1rem' }}>
              {resC === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo'}
            </span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvando || buscando || !formC.funcionarioId}>
            {salvando ? 'Salvando…' : registroExistente ? '💾 Atualizar Mês' : '💾 Salvar Lançamento'}
          </button>
          <button type="button" className="btn-ghost" onClick={limparCompleto}>Limpar</button>
        </div>
      </form>
    </div>
  )
}
