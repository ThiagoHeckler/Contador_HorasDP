import { useState, useEffect, useCallback } from 'react'
import { getRegistros, deletarRegistro, atualizarRegistro, getFuncionarios } from '../services/api'
import { urlExportarRegistro, urlExportarTodos } from '../services/api'
import Modal from '../components/Modal'

const MESES = {
  1: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  2: ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

export default function Registros() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')

  // Edição
  const [editando, setEditando] = useState(null)
  const [horasEdit, setHorasEdit] = useState({})
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  // Remoção
  const [confirmarId, setConfirmarId] = useState(null)

  // Detalhes
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
    setEditando(r)
    setHorasEdit({ ...r.horas })
    setErroEdit('')
  }

  async function salvarEdicao() {
    setSalvandoEdit(true)
    setErroEdit('')
    try {
      await atualizarRegistro(editando.id, { horas: horasEdit })
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
    ? mesesEditando.reduce((acc, m) => acc + (Number(horasEdit[m]) || 0), 0)
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

        {/* Filtros */}
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
                  <th>Total (h)</th>
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
                    <td style={{ fontWeight: 700 }}>
                      {r.totalHoras > 0 ? '+' : ''}{r.totalHoras.toFixed(1)}
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
                <tr><th>Mês</th><th>Horas</th></tr>
              </thead>
              <tbody>
                {MESES[detalhe.semestre].map(m => (
                  <tr key={m}>
                    <td>{m}</td>
                    <td style={{ fontWeight: 600 }}>
                      {(detalhe.horas[m] || 0) > 0 ? '+' : ''}{(detalhe.horas[m] || 0).toFixed(1)} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`resultado-box ${detalhe.resultado}`} style={{ marginTop: '1rem' }}>
            <div>
              <div className="resultado-label">Total</div>
              <div className="resultado-valor">
                {detalhe.totalHoras > 0 ? '+' : ''}{detalhe.totalHoras.toFixed(1)} h
              </div>
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
          <div className="horas-grid">
            {mesesEditando.map(mes => (
              <div className="hora-item form-group" key={mes}>
                <label htmlFor={`edit-${mes}`}>{mes}</label>
                <input
                  id={`edit-${mes}`}
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={horasEdit[mes] ?? ''}
                  onChange={e => setHorasEdit(p => ({ ...p, [mes]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className={`resultado-box ${totalEdit >= 0 ? 'positivo' : 'negativo'}`} style={{ marginTop: '1rem' }}>
            <div>
              <div className="resultado-label">Total</div>
              <div className="resultado-valor">{totalEdit > 0 ? '+' : ''}{totalEdit.toFixed(1)} h</div>
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
