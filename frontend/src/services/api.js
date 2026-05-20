const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`)
  return data
}

// Empresas
export const getEmpresas = () => request('/empresas')
export const getEmpresa = (id) => request(`/empresas/${id}`)
export const criarEmpresa = (body) => request('/empresas', { method: 'POST', body: JSON.stringify(body) })
export const atualizarEmpresa = (id, body) => request(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deletarEmpresa = (id) => request(`/empresas/${id}`, { method: 'DELETE' })

// Funcionários
export const getFuncionarios = (empresaId) => request(`/funcionarios?empresaId=${empresaId}`)
export const criarFuncionario = (body) => request('/funcionarios', { method: 'POST', body: JSON.stringify(body) })
export const deletarFuncionario = (id) => request(`/funcionarios/${id}`, { method: 'DELETE' })

// Registros
export const getRegistros = (empresaId) => request(`/registros?empresaId=${empresaId}`)
export const getRegistro = (id) => request(`/registros/${id}`)
export const criarRegistro = (body) => request('/registros', { method: 'POST', body: JSON.stringify(body) })
export const atualizarRegistro = (id, body) => request(`/registros/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deletarRegistro = (id) => request(`/registros/${id}`, { method: 'DELETE' })

// Exportação Excel
export const urlExportarRegistro = (id) => `${BASE}/exportar/${id}`
export const urlExportarTodos = (empresaId) => `${BASE}/exportar-todos${empresaId ? `?empresaId=${empresaId}` : ''}`
