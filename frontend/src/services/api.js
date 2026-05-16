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

// Funcionários
export const getFuncionarios = () => request('/funcionarios')
export const criarFuncionario = (body) => request('/funcionarios', { method: 'POST', body: JSON.stringify(body) })
export const deletarFuncionario = (id) => request(`/funcionarios/${id}`, { method: 'DELETE' })

// Registros
export const getRegistros = () => request('/registros')
export const getRegistro = (id) => request(`/registros/${id}`)
export const criarRegistro = (body) => request('/registros', { method: 'POST', body: JSON.stringify(body) })
export const atualizarRegistro = (id, body) => request(`/registros/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deletarRegistro = (id) => request(`/registros/${id}`, { method: 'DELETE' })

// Exportação Excel
export function urlExportarRegistro(id) { return `${BASE}/exportar/${id}` }
export function urlExportarTodos({ semestre, ano } = {}) {
  const params = new URLSearchParams()
  if (semestre) params.set('semestre', semestre)
  if (ano) params.set('ano', ano)
  const qs = params.toString()
  return `${BASE}/exportar-todos${qs ? `?${qs}` : ''}`
}
