import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFuncionarios, criarRegistro } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

const MESES = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 6 }, (_, i) => anoAtual - 2 + i)

// ── Lançamento Simples ───────────────────────────────────────────────────────

function estadoSimplesInicial() {
  return { tipo: 'credito', horas: '', minutos: '' }
}

function estadosSimplesIniciais(semestre) {
  return Object.fromEntries(MESES[semestre].map(m => [m, estadoSimplesInicial()]))
}

function simplesParaMinutos(est) {
  const total = (parseInt(est.horas) || 0) * 60 + (parseInt(est.minutos) || 0)
  return est.tipo === 'debito' ? -total : total
}

// ── Lançamento Completo ──────────────────────────────────────────────────────

function estadoCompletoInicial() {
  return { credHoras: '', credMinutos: '', debHoras: '', debMinutos: '' }
}

function estadosCompletosIniciais(semestre) {
  return Object.fromEntries(MESES[semestre].map(m => [m, estadoCompletoInicial()]))
}

function completoParaMinutos(est) {
  const cred = (parseInt(est.credHoras) || 0) * 60 + (parseInt(est.credMinutos) || 0)
  const deb  = (parseInt(est.debHoras)  || 0) * 60 + (parseInt(est.debMinutos)  || 0)
  return cred - deb
}

// ── Utilitário ───────────────────────────────────────────────────────────────

export function formatarHHMM(totalMin) {
  const neg = totalMin < 0
  const abs = Math.abs(totalMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return (neg ? '-' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

function clampMin(valor) {
  const n = parseInt(valor)
  return isNaN(n) ? '' : String(Math.min(59, Math.max(0, n)))
}

// ── Componente: card de mês — modo simples ───────────────────────────────────

function MesCardSimples({ mes, estado, onChange }) {
  const minTotal = simplesParaMinutos(estado)
  return (
    <div className={`mes-card ${estado.tipo}`}>
      <div className="mes-nome">{mes}</div>
      <div className="mes-tipo-toggle">
        <button type="button"
          className={`tipo-btn credito${estado.tipo === 'credito' ? ' ativo' : ''}`}
          onClick={() => onChange('tipo', 'credito')}>+ Crédito</button>
        <button type="button"
          className={`tipo-btn debito${estado.tipo === 'debito' ? ' ativo' : ''}`}
          onClick={() => onChange('tipo', 'debito')}>− Débito</button>
      </div>
      <div className="mes-inputs">
        <div className="form-group">
          <label>Horas</label>
          <input type="number" min="0" placeholder="00" value={estado.horas}
            onChange={e => onChange('horas', e.target.value)} />
        </div>
        <span className="sep-hhmm">:</span>
        <div className="form-group">
          <label>Min</label>
          <input type="number" min="0" max="59" placeholder="00" value={estado.minutos}
            onChange={e => onChange('minutos', clampMin(e.target.value))} />
        </div>
      </div>
      <div className={`mes-total ${estado.tipo}`}>
        {minTotal !== 0 ? (estado.tipo === 'debito' ? '-' : '+') : ''}{formatarHHMM(Math.abs(minTotal))}
      </div>
    </div>
  )
}

// ── Componente: card de mês — modo completo ──────────────────────────────────

function MesCardCompleto({ mes, estado, onChange }) {
  const cred = (parseInt(estado.credHoras) || 0) * 60 + (parseInt(estado.credMinutos) || 0)
  const deb  = (parseInt(estado.debHoras)  || 0) * 60 + (parseInt(estado.debMinutos)  || 0)
  const saldo = cred - deb
  const saldoTipo = saldo >= 0 ? 'credito' : 'debito'

  return (
    <div className={`mes-card-completo ${saldoTipo}`}>
      <div className="mes-nome">{mes}</div>

      <div className="mes-completo-linha credito-linha">
        <span className="mes-completo-label credito-label">+ Crédito</span>
        <div className="mes-inputs" style={{ flex: 1 }}>
          <div className="form-group">
            <label>Horas</label>
            <input type="number" min="0" placeholder="00" value={estado.credHoras}
              onChange={e => onChange('credHoras', e.target.value)} />
          </div>
          <span className="sep-hhmm">:</span>
          <div className="form-group">
            <label>Min</label>
            <input type="number" min="0" max="59" placeholder="00" value={estado.credMinutos}
              onChange={e => onChange('credMinutos', clampMin(e.target.value))} />
          </div>
        </div>
        <span className="mes-completo-sub credito-sub">{formatarHHMM(cred)}</span>
      </div>

      <div className="mes-completo-linha debito-linha">
        <span className="mes-completo-label debito-label">− Débito</span>
        <div className="mes-inputs" style={{ flex: 1 }}>
          <div className="form-group">
            <label>Horas</label>
            <input type="number" min="0" placeholder="00" value={estado.debHoras}
              onChange={e => onChange('debHoras', e.target.value)} />
          </div>
          <span className="sep-hhmm">:</span>
          <div className="form-group">
            <label>Min</label>
            <input type="number" min="0" max="59" placeholder="00" value={estado.debMinutos}
              onChange={e => onChange('debMinutos', clampMin(e.target.value))} />
          </div>
        </div>
        <span className="mes-completo-sub debito-sub">{formatarHHMM(deb)}</span>
      </div>

      <div className={`mes-completo-saldo ${saldoTipo}`}>
        <span className="saldo-label">Saldo</span>
        <span className="saldo-valor">{formatarHHMM(saldo)}</span>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function Lancamento() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()

  const [modo, setModo] = useState('simples')
  const [funcionarios, setFuncionarios] = useState([])
  const [form, setForm] = useState({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })

  const [estadosSimples, setEstadosSimples] = useState(estadosSimplesIniciais(1))
  const [estadosCompleto, setEstadosCompleto] = useState(estadosCompletosIniciais(1))

  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loadingFunc, setLoadingFunc] = useState(true)

  useEffect(() => {
    getFuncionarios(empresa.id)
      .then(setFuncionarios)
      .catch(e => setErro(e.message))
      .finally(() => setLoadingFunc(false))
  }, [empresa.id])

  function handleSemestre(e) {
    const sem = Number(e.target.value)
    setForm(p => ({ ...p, semestre: String(sem) }))
    setEstadosSimples(estadosSimplesIniciais(sem))
    setEstadosCompleto(estadosCompletosIniciais(sem))
  }

  function handleModo(novoModo) {
    setModo(novoModo)
    setErro('')
  }

  const mesesAtivos = MESES[Number(form.semestre)]

  const minutosCalculados = Object.fromEntries(
    mesesAtivos.map(m => [
      m,
      modo === 'simples'
        ? simplesParaMinutos(estadosSimples[m])
        : completoParaMinutos(estadosCompleto[m]),
    ])
  )

  const totalMinutos = Object.values(minutosCalculados).reduce((acc, v) => acc + v, 0)
  const resultado = totalMinutos >= 0 ? 'positivo' : 'negativo'

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.funcionarioId) { setErro('Selecione um funcionário.'); return }
    setSalvando(true)
    try {
      await criarRegistro({
        ...form,
        empresaId: empresa.id,
        semestre: Number(form.semestre),
        ano: Number(form.ano),
        minutos: minutosCalculados,
      })
      navigate('/registros')
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function limpar() {
    const sem = Number(form.semestre)
    setForm(p => ({ ...p, funcionarioId: '' }))
    setEstadosSimples(estadosSimplesIniciais(sem))
    setEstadosCompleto(estadosCompletosIniciais(sem))
    setErro('')
  }

  return (
    <div>
      <div className="page-title">📋 Lançamento de Horas</div>

      <form onSubmit={salvar}>
        {/* Dados do lançamento */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Dados do Lançamento</div>
          {erro && <div className="alert alert-error">⚠ {erro}</div>}

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="funcionario">Funcionário *</label>
              {loadingFunc ? (
                <input disabled placeholder="Carregando…" />
              ) : (
                <select
                  id="funcionario"
                  value={form.funcionarioId}
                  onChange={e => setForm(p => ({ ...p, funcionarioId: e.target.value }))}
                >
                  <option value="">Selecione um funcionário…</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome}{f.matricula ? ` — ${f.matricula}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {!loadingFunc && funcionarios.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--cinza-400)', marginTop: '0.3rem' }}>
                  Nenhum funcionário cadastrado.{' '}
                  <a href="/" style={{ color: 'var(--azul-medio)' }}>Cadastre um.</a>
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="semestre">Semestre *</label>
              <select id="semestre" value={form.semestre} onChange={handleSemestre}>
                <option value="1">1º Semestre (Jan – Jun)</option>
                <option value="2">2º Semestre (Jul – Dez)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ano">Ano *</label>
              <select id="ano" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))}>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Seletor de modo */}
        <div className="card" style={{ padding: '1rem 1.5rem' }}>
          <div className="modo-toggle-wrapper">
            <span className="modo-toggle-label">Tipo de lançamento:</span>
            <div className="modo-toggle">
              <button
                type="button"
                className={`modo-btn${modo === 'simples' ? ' ativo' : ''}`}
                onClick={() => handleModo('simples')}
              >
                Simples
              </button>
              <button
                type="button"
                className={`modo-btn${modo === 'completo' ? ' ativo' : ''}`}
                onClick={() => handleModo('completo')}
              >
                Completo
              </button>
            </div>
            <span className="modo-descricao">
              {modo === 'simples'
                ? 'Um valor por mês — informe se é crédito ou débito.'
                : 'Dois valores por mês — crédito e débito; o saldo é calculado automaticamente.'}
            </span>
          </div>
        </div>

        {/* Grade de meses */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Horas por Mês</div>

          {modo === 'simples' ? (
            <div className="horas-grid-lancamento">
              {mesesAtivos.map(mes => (
                <MesCardSimples
                  key={mes}
                  mes={mes}
                  estado={estadosSimples[mes]}
                  onChange={(campo, valor) =>
                    setEstadosSimples(p => ({ ...p, [mes]: { ...p[mes], [campo]: valor } }))
                  }
                />
              ))}
            </div>
          ) : (
            <div className="horas-grid-completo">
              {mesesAtivos.map(mes => (
                <MesCardCompleto
                  key={mes}
                  mes={mes}
                  estado={estadosCompleto[mes]}
                  onChange={(campo, valor) =>
                    setEstadosCompleto(p => ({ ...p, [mes]: { ...p[mes], [campo]: valor } }))
                  }
                />
              ))}
            </div>
          )}

          <div className={`resultado-box ${resultado}`}>
            <div>
              <div className="resultado-label">Total Semestral</div>
              <div className="resultado-valor">{formatarHHMM(totalMinutos)}</div>
            </div>
            <span className={`badge badge-${resultado}`} style={{ fontSize: '0.88rem', padding: '0.4rem 1rem' }}>
              {resultado === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo'}
            </span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : '💾 Salvar Lançamento'}
          </button>
          <button type="button" className="btn-ghost" onClick={limpar}>Limpar</button>
        </div>
      </form>
    </div>
  )
}
