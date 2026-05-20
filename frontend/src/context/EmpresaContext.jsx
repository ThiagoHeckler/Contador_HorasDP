import { createContext, useContext, useState } from 'react'

const EmpresaContext = createContext(null)

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(() => {
    try {
      const salvo = localStorage.getItem('empresaAtual')
      return salvo ? JSON.parse(salvo) : null
    } catch {
      return null
    }
  })

  function selecionarEmpresa(emp) {
    setEmpresa(emp)
    localStorage.setItem('empresaAtual', JSON.stringify(emp))
  }

  function limparEmpresa() {
    setEmpresa(null)
    localStorage.removeItem('empresaAtual')
  }

  return (
    <EmpresaContext.Provider value={{ empresa, selecionarEmpresa, limparEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
