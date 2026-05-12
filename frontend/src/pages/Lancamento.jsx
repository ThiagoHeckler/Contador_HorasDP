import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFuncionarios, criarRegistro } from '../services/api'

const MESES = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 6 }, (_, i) => anoAtual - 2 + i)

function horasIniciais(semestre) {
  return Object.fromEntries(MESES[semestre].map(m => [m, '']))
}

export default function Lancamento() {
  const navigate = useNavigate()
  const [funcionarios, setFuncionarios] = useState([])
  const [form, setForm] = useState({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })
  const [horas, setHoras] = useState(horasIniciais(1))
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
    setHoras(horasIniciais(Number(sem)))
  }

  function handleHora(mes, valor) {
    setHoras(p => ({ ...p, [mes]: valor }))
  }

  const mesesAtivos = MESES[Number(form.semestre)]

  const horasNumericas = Object.fromEntries(
    mesesAtivos.map(m => [m, horas[m] === '' ? 0 : Number(horas[m])])
  )
  const total = Object.values(horasNumericas).reduce((acc, h) => acc + h, 0)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.funcionarioId) { setErro('Selecione um funcionário.'); return }
    setSalvando(true)
    try {
      await criarRegistro({ ...form, semestre: Number(form.semestre), ano: Number(form.ano), horas: horasNumericas })
      navigate('/registros')
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function limpar() {
    setForm({ funcionarioId: '', semestre: '1', ano: String(anoAtual) })
    setHoras(horasIniciais(1))
    setErro('')
  }

  const resultado = total >= 0 ? 'positivo' : 'negativo'

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
                  Nenhum funcionário cadastrado. <a href="/" style={{ color: 'var(--azul-medio)' }}>Cadastre um.</a>
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
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>
            Horas por Mês
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--cinza-400)', marginLeft: '0.5rem' }}>
              (valores negativos = débito)
            </span>
          </div>

          <div className="horas-grid">
            {mesesAtivos.map(mes => (
              <div className="hora-item form-group" key={mes}>
                <label htmlFor={`h-${mes}`}>{mes}</label>
                <input
                  id={`h-${mes}`}
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={horas[mes]}
                  onChange={e => handleHora(mes, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className={`resultado-box ${resultado}`}>
            <div>
              <div className="resultado-label">Total Semestral</div>
              <div className="resultado-valor">
                {total > 0 ? '+' : ''}{total.toFixed(1)} h
              </div>
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
