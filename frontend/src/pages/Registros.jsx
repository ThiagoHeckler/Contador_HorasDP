import { useState, useEffect, useCallback } from 'react'
import { getRegistros, deletarRegistro, atualizarRegistro } from '../services/api'
import { urlExportarRegistro, urlExportarTodos } from '../services/api'
import Modal from '../components/Modal'
import { formatarHHMM } from './Lancamento'

const MESES = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

function estadoDeMinutos(totalMin) {
  const neg = totalMin < 0
  const abs = Math.abs(totalMin)
  return {
    tipo: neg ? 'debito' : 'credito',
    horas: String(Math.floor(abs / 60)),
    minutos: String(abs % 60),
  }
}

function paraMinutos(estado) {
  const h = parseInt(estado.horas) || 0
  const m = parseInt(estado.minutos) || 0
  const total = h * 60 + m
  return estado.tipo === 'debito' ? -total : total
}

export default function Registros() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')

  const [editando, setEditando] = useState(null)
  const [estadosEdit, setEstadosEdit] = useState({})
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  const [confirmarId, setConfirmarId] = useState(null)
  const [detalhe, setDetalhe] = useState(null)

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setRegistros(await getRegistros())
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirEdicao(r) {
    const meses = MESES[r.semestre]
    const estados = Object.fromEntries(meses.map(m => [m, estadoDeMinutos(r.minutos?.[m] || 0)]))
    setEditando(r)
    setEstadosEdit(estados)
    setErroEdit('')
  }

  function handleEstadoEdit(mes, campo, valor) {
    setEstadosEdit(p => ({ ...p, [mes]: { ...p[mes], [campo]: valor } }))
  }

  function handleMinutosEdit(mes, valor) {
    const num = parseInt(valor)
    if (isNaN(num)) { handleEstadoEdit(mes, 'minutos', ''); return }
    handleEstadoEdit(mes, 'minutos', String(Math.min(59, Math.max(0, num))))
  }

  async function salvarEdicao() {
    setSalvandoEdit(true)
    setErroEdit('')
    const meses = MESES[editando.semestre]
    const minutosPayload = Object.fromEntries(meses.map(m => [m, paraMinutos(estadosEdit[m])]))
    try {
      await atualizarRegistro(editando.id, { minutos: minutosPayload })
      setEditando(null)
      carregar()
    } catch (e) {
      setErroEdit(e.message)
    } finally {
      setSalvandoEdit(false)
    }
  }

  async function remover() {
    try {
      await deletarRegistro(confirmarId)
      setConfirmarId(null)
      carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  const lista = registros.filter(r => {
    const busca = filtroBusca.toLowerCase()
    const matchNome = r.nomeFuncionario.toLowerCase().includes(busca)
    const matchSem = filtroSemestre === '' || String(r.semestre) === filtroSemestre
    return matchNome && matchSem
  })

  const mesesEditando = editando ? MESES[editando.semestre] : []
  const totalEdit = editando
    ? mesesEditando.reduce((acc, m) => acc + paraMinutos(estadosEdit[m] || { tipo: 'credito', horas: '0', minutos: '0' }), 0)
    : 0

  return (
    <div>
      <div className="page-title">📂 Registros de Horas</div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Todos os Lançamentos</span>
          <button
            className="btn-success btn-sm"
            onClick={() => window.open(urlExportarTodos(), '_blank')}
            disabled={registros.length === 0}
          >
            ⬇ Exportar Todos (Excel)
          </button>
        </div>

        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label htmlFor="busca">Buscar por nome</label>
            <input
              id="busca"
              type="text"
              placeholder="Digite o nome…"
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="filtro-sem">Semestre</label>
            <select id="filtro-sem" value={filtroSemestre} onChange={e => setFiltroSemestre(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">1º Semestre</option>
              <option value="2">2º Semestre</option>
            </select>
          </div>
        </div>

        {erro && <div className="alert alert-error">⚠ {erro}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : lista.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{registros.length === 0 ? 'Nenhum lançamento cadastrado.' : 'Nenhum resultado para o filtro aplicado.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Matrícula</th>
                  <th>Semestre</th>
                  <th>Ano</th>
                  <th>Total</th>
                  <th>Resultado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.nomeFuncionario}</strong></td>
                    <td>{r.matricula || <span style={{ color: 'var(--cinza-400)' }}>—</span>}</td>
                    <td>{r.semestre}º Sem.</td>
                    <td>{r.ano}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatarHHMM(r.totalMinutos || 0)}
                    </td>
                    <td>
                      <span className={`badge badge-${r.resultado}`}>
                        {r.resultado === 'positivo' ? '✔ Positivo' : '✖ Negativo'}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-ghost btn-sm" onClick={() => setDetalhe(r)}>Ver</button>
                        <button className="btn-primary btn-sm" onClick={() => abrirEdicao(r)}>Editar</button>
                        <button
                          className="btn-success btn-sm"
                          onClick={() => window.open(urlExportarRegistro(r.id), '_blank')}
                          title="Exportar Excel"
                        >⬇</button>
                        <button className="btn-danger btn-sm" onClick={() => setConfirmarId(r.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: detalhe */}
      {detalhe && (
        <Modal titulo={`Detalhes – ${detalhe.nomeFuncionario}`} onClose={() => setDetalhe(null)}>
          <p style={{ marginBottom: '0.75rem', color: 'var(--cinza-600)', fontSize: '0.88rem' }}>
            {detalhe.semestre}º Semestre / {detalhe.ano}
            {detalhe.matricula ? ` — Matrícula: ${detalhe.matricula}` : ''}
          </p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Mês</th><th>Horas (HH:MM)</th></tr>
              </thead>
              <tbody>
                {MESES[detalhe.semestre].map(m => {
                  const min = detalhe.minutos?.[m] || 0
                  return (
                    <tr key={m}>
                      <td>{m}</td>
                      <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatarHHMM(min)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className={`resultado-box ${detalhe.resultado}`} style={{ marginTop: '1rem' }}>
            <div>
              <div className="resultado-label">Total</div>
              <div className="resultado-valor">{formatarHHMM(detalhe.totalMinutos || 0)}</div>
            </div>
            <span className={`badge badge-${detalhe.resultado}`}>
              {detalhe.resultado === 'positivo' ? '✔ Saldo Positivo' : '✖ Saldo Negativo'}
            </span>
          </div>
        </Modal>
      )}

      {/* Modal: edição */}
      {editando && (
        <Modal
          titulo={`Editar – ${editando.nomeFuncionario}`}
          onClose={() => setEditando(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarEdicao} disabled={salvandoEdit}>
                {salvandoEdit ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          }
        >
          {erroEdit && <div className="alert alert-error">⚠ {erroEdit}</div>}
          <p style={{ fontSize: '0.85rem', color: 'var(--cinza-600)', marginBottom: '0.75rem' }}>
            {editando.semestre}º Semestre / {editando.ano}
          </p>
          <div className="horas-grid-lancamento" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {mesesEditando.map(mes => {
              const est = estadosEdit[mes] || { tipo: 'credito', horas: '', minutos: '' }
              const minTotal = paraMinutos(est)
              return (
                <div key={mes} className={`mes-card ${est.tipo}`}>
                  <div className="mes-nome">{mes}</div>
                  <div className="mes-tipo-toggle">
                    <button
                      type="button"
                      className={`tipo-btn credito${est.tipo === 'credito' ? ' ativo' : ''}`}
                      onClick={() => handleEstadoEdit(mes, 'tipo', 'credito')}
                    >+ Crédito</button>
                    <button
                      type="button"
                      className={`tipo-btn debito${est.tipo === 'debito' ? ' ativo' : ''}`}
                      onClick={() => handleEstadoEdit(mes, 'tipo', 'debito')}
                    >− Débito</button>
                  </div>
                  <div className="mes-inputs">
                    <div className="form-group">
                      <label>Horas</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        value={est.horas}
                        onChange={e => handleEstadoEdit(mes, 'horas', e.target.value)}
                      />
                    </div>
                    <span className="sep-hhmm">:</span>
                    <div className="form-group">
                      <label>Min</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="00"
                        value={est.minutos}
                        onChange={e => handleMinutosEdit(mes, e.target.value)}
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
          <div className={`resultado-box ${totalEdit >= 0 ? 'positivo' : 'negativo'}`} style={{ marginTop: '1rem' }}>
            <div>
              <div className="resultado-label">Total</div>
              <div className="resultado-valor">{formatarHHMM(totalEdit)}</div>
            </div>
            <span className={`badge badge-${totalEdit >= 0 ? 'positivo' : 'negativo'}`}>
              {totalEdit >= 0 ? '✔ Positivo' : '✖ Negativo'}
            </span>
          </div>
        </Modal>
      )}

      {/* Modal: confirmar remoção */}
      {confirmarId && (
        <Modal
          titulo="Confirmar Remoção"
          onClose={() => setConfirmarId(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setConfirmarId(null)}>Cancelar</button>
              <button className="btn-danger" onClick={remover}>Remover</button>
            </>
          }
        >
          <p>Deseja remover este registro de horas? Esta ação não pode ser desfeita.</p>
        </Modal>
      )}
    </div>
  )
}
