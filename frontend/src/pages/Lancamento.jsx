import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFuncionarios, criarRegistro } from '../services/api'

const MESES = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 6 }, (_, i) => anoAtual - 2 + i)

function estadoMesInicial() {
  return { tipo: 'credito', horas: '', minutos: '' }
}

function estadosMesesIniciais(semestre) {
  return Object.fromEntries(MESES[semestre].map(m => [m, estadoMesInicial()]))
}

function paraMinutos(estado) {
  const h = parseInt(estado.horas) || 0
  const m = parseInt(estado.minutos) || 0
  const total = h * 60 + m
  return estado.tipo === 'debito' ? -total : total
}

export function formatarHHMM(totalMin) {
  const neg = totalMin < 0
  const abs = Math.abs(totalMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return (neg ? '-' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

export default function Lancamento() {
  const navigate = useNavigate()
  const [funcionarios, setFuncionarios] = useState([])
  const [form, setForm] = useState({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })
  const [estados, setEstados] = useState(estadosMesesIniciais(1))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loadingFunc, setLoadingFunc] = useState(true)

  useEffect(() => {
    getFuncionarios()
      .then(setFuncionarios)
      .catch(e => setErro(e.message))
      .finally(() => setLoadingFunc(false))
  }, [])

  function handleSemestre(e) {
    const sem = e.target.value
    setForm(p => ({ ...p, semestre: sem }))
    setEstados(estadosMesesIniciais(Number(sem)))
  }

  function handleEstado(mes, campo, valor) {
    setEstados(p => ({ ...p, [mes]: { ...p[mes], [campo]: valor } }))
  }

  function handleMinutos(mes, valor) {
    // Garante 0-59
    const num = parseInt(valor)
    if (isNaN(num)) { handleEstado(mes, 'minutos', ''); return }
    handleEstado(mes, 'minutos', String(Math.min(59, Math.max(0, num))))
  }

  const mesesAtivos = MESES[Number(form.semestre)]
  const totalMinutos = mesesAtivos.reduce((acc, m) => acc + paraMinutos(estados[m]), 0)
  const resultado = totalMinutos >= 0 ? 'positivo' : 'negativo'

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.funcionarioId) { setErro('Selecione um funcionário.'); return }
    const minutosPayload = Object.fromEntries(mesesAtivos.map(m => [m, paraMinutos(estados[m])]))
    setSalvando(true)
    try {
      await criarRegistro({
        ...form,
        semestre: Number(form.semestre),
        ano: Number(form.ano),
        minutos: minutosPayload,
      })
      navigate('/registros')
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function limpar() {
    setForm({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })
    setEstados(estadosMesesIniciais(1))
    setErro('')
  }

  return (
    <div>
      <div className="page-title">📋 Lançamento de Horas</div>

      <form onSubmit={salvar}>
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

        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.25rem' }}>Horas por Mês</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--cinza-400)', marginBottom: '1rem' }}>
            Selecione Crédito ou Débito e informe as horas e minutos de cada mês.
          </p>

          <div className="horas-grid-lancamento">
            {mesesAtivos.map(mes => {
              const est = estados[mes]
              const minTotal = paraMinutos(est)
              return (
                <div key={mes} className={`mes-card ${est.tipo}`}>
                  <div className="mes-nome">{mes}</div>

                  <div className="mes-tipo-toggle">
                    <button
                      type="button"
                      className={`tipo-btn credito${est.tipo === 'credito' ? ' ativo' : ''}`}
                      onClick={() => handleEstado(mes, 'tipo', 'credito')}
                    >
                      + Crédito
                    </button>
                    <button
                      type="button"
                      className={`tipo-btn debito${est.tipo === 'debito' ? ' ativo' : ''}`}
                      onClick={() => handleEstado(mes, 'tipo', 'debito')}
                    >
                      − Débito
                    </button>
                  </div>

                  <div className="mes-inputs">
                    <div className="form-group">
                      <label htmlFor={`h-${mes}`}>Horas</label>
                      <input
                        id={`h-${mes}`}
                        type="number"
                        min="0"
                        placeholder="00"
                        value={est.horas}
                        onChange={e => handleEstado(mes, 'horas', e.target.value)}
                      />
                    </div>
                    <span className="sep-hhmm">:</span>
                    <div className="form-group">
                      <label htmlFor={`m-${mes}`}>Min</label>
                      <input
                        id={`m-${mes}`}
                        type="number"
                        min="0"
                        max="59"
                        placeholder="00"
                        value={est.minutos}
                        onChange={e => handleMinutos(mes, e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={`mes-total ${est.tipo}`}>
                    {minTotal !== 0 ? (est.tipo === 'debito' ? '-' : '+') : ''}{formatarHHMM(Math.abs(minTotal))}
                  </div>
                </div>
              )
            })}
          </div>

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
