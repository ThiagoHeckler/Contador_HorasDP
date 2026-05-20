import { NavLink } from 'react-router-dom'
import { useEmpresa } from '../context/EmpresaContext'

export default function Header() {
  const { empresa, limparEmpresa } = useEmpresa()

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand">
          <span className="icon">⏱</span>
          <span className="brand-text">Contador de Horas – DP</span>
        </div>
        {empresa && (
          <div className="header-empresa">
            <span className="header-empresa-nome">{empresa.nome}</span>
            <span className="header-empresa-cnpj">{empresa.cnpj}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Funcionários
          </NavLink>
          <NavLink to="/lancamento" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Lançamento
          </NavLink>
          <NavLink to="/registros" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Registros
          </NavLink>
        </nav>
        {empresa && (
          <button className="btn-alterar-empresa" onClick={limparEmpresa} title="Trocar de empresa">
            🔄 Alterar empresa
          </button>
        )}
      </div>
    </header>
  )
}
