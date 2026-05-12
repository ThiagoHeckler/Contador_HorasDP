import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Funcionarios from './pages/Funcionarios'
import Lancamento from './pages/Lancamento'
import Registros from './pages/Registros'

export default function App() {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Funcionarios />} />
          <Route path="/lancamento" element={<Lancamento />} />
          <Route path="/registros" element={<Registros />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
