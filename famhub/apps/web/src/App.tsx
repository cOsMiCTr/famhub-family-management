import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Contracts } from './pages/Contracts'
import { FixedCosts } from './pages/FixedCosts'
import { Assets } from './pages/Assets'
import { Loans } from './pages/Loans'
import { Family } from './pages/Family'
import { Settings } from './pages/Settings'
import { Layout } from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/fixed-costs" element={<FixedCosts />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/family" element={<Family />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
