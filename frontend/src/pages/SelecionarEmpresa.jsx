import { useState, useEffect } from 'react'
import { getEmpresas, criarEmpresa } from '../services/api'
import { useEmpresa } from '../context/EmpresaContext'

function formatarCNPJ(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 14)
  return nums
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function SelecionarEmpresa() {
  const { selecionarEmpresa } = useEmpresa()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostraCadastro, setMostraCadastro] = useState(false)
  const [form, setForm] = useState({ nome: '', cnpj: '', codigo: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  async function carregar() {
    try {
      setLoading(true)
      const lista = await getEmpresas()
      setEmpresas(lista)
      if (lista.length === 0) setMostraCadastro(true)
    } catch (e) {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function handleCNPJ(e) {
    setForm(p => ({ ...p, cnpj: formatarCNPJ(e.target.value) }))
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const nova = await criarEmpresa(form)
      selecionarEmpresa(nova)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const listaFiltrada = empresas.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpj.includes(busca)
  )

  return (
    <div className="selecao-empresa-page">
      <div className="selecao-empresa-box">
        <div className="selecao-header">
          <span className="selecao-icon">⏱</span>
          <h1 className="selecao-titulo">Contador de Horas</h1>
          <p className="selecao-sub">Departamento Pessoal</p>
        </div>

        {erro && <div className="alert alert-error">⚠ {erro}</div>}

        {!mostraCadastro ? (
          <>
            <h2 className="selecao-secao">Selecione a empresa</h2>

            {empresas.length > 3 && (
              <input
                className="selecao-busca"
                type="text"
                placeholder="Buscar empresa…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                autoFocus
              />
            )}

            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="empresa-lista">
                {listaFiltrada.map(emp => (
                  <button
                    key={emp.id}
                    className="empresa-card-btn"
                    onClick={() => selecionarEmpresa(emp)}
                  >
                    <div className="empresa-card-nome">{emp.nome}</div>
                    <div className="empresa-card-info">
                      <span className="empresa-card-codigo">{emp.codigo}</span>
                      <span className="empresa-card-cnpj">{emp.cnpj}</span>
                    </div>
                  </button>
                ))}
                {listaFiltrada.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--cinza-400)', padding: '1rem 0' }}>
                    Nenhuma empresa encontrada.
                  </p>
                )}
              </div>
            )}

            <button className="btn-primary selecao-nova-btn" onClick={() => { setMostraCadastro(true); setErro('') }}>
              + Cadastrar nova empresa
            </button>
          </>
        ) : (
          <>
            <h2 className="selecao-secao">Nova Empresa</h2>
            <form onSubmit={salvar} className="selecao-form">
              <div className="form-group">
                <label htmlFor="emp-nome">Nome da empresa *</label>
                <input
                  id="emp-nome"
                  type="text"
                  placeholder="Ex: Acme Serviços Ltda"
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="emp-cnpj">CNPJ *</label>
                <input
                  id="emp-cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={handleCNPJ}
                  maxLength={18}
                />
              </div>
              <div className="form-group">
                <label htmlFor="emp-codigo">Código de identificação *</label>
                <input
                  id="emp-codigo"
                  type="text"
                  placeholder="Ex: ACME01"
                  value={form.codigo}
                  onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Cadastrar e Entrar'}
                </button>
                {empresas.length > 0 && (
                  <button type="button" className="btn-ghost" onClick={() => { setMostraCadastro(false); setErro('') }}>
                    Voltar
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
