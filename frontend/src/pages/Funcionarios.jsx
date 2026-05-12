import { useState, useEffect } from 'react'
import { getFuncionarios, criarFuncionario, deletarFuncionario } from '../services/api'
import Modal from '../components/Modal'

export default function Funcionarios() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', matricula: '' })
  const [confirmarId, setConfirmarId] = useState(null)

  async function carregar() {
    try {
      setLoading(true)
      setLista(await getFuncionarios())
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirModal() {
    setForm({ nome: '', matricula: '' })
    setErro('')
    setShowModal(true)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Informe o nome do funcionário.'); return }
    setSalvando(true)
    setErro('')
    try {
      await criarFuncionario(form)
      setShowModal(false)
      carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarRemover() {
    try {
      await deletarFuncionario(confirmarId)
      setConfirmarId(null)
      carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <div>
      <div className="page-title">👥 Funcionários</div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Cadastro de Funcionários</span>
          <button className="btn-primary" onClick={abrirModal}>+ Novo Funcionário</button>
        </div>

        {erro && !showModal && <div className="alert alert-error">⚠ {erro}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : lista.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>Nenhum funcionário cadastrado.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  <th>Cadastrado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.nome}</strong></td>
                    <td>{f.matricula || <span style={{ color: 'var(--cinza-400)' }}>—</span>}</td>
                    <td>{new Date(f.criadoEm).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-danger btn-sm" onClick={() => setConfirmarId(f.id)}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: novo funcionário */}
      {showModal && (
        <Modal
          titulo="Novo Funcionário"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          }
        >
          {erro && <div className="alert alert-error">⚠ {erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nome">Nome *</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="matricula">Matrícula</label>
                <input
                  id="matricula"
                  type="text"
                  placeholder="Ex: 001234"
                  value={form.matricula}
                  onChange={e => setForm(p => ({ ...p, matricula: e.target.value }))}
                />
              </div>
            </div>
          </form>
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
              <button className="btn-danger" onClick={confirmarRemover}>Remover</button>
            </>
          }
        >
          <p>Remover este funcionário excluirá também todos os seus registros de horas. Deseja continuar?</p>
        </Modal>
      )}
    </div>
  )
}
