import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="icon">⏱</span>
        <span>Contador de Horas – DP</span>
      </div>
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
    </header>
  )
}
