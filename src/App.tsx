import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import KiEditor from './pages/KIEditor'
import Mindmaps from './pages/Mindmaps'
import KiChat from './pages/KIChat'
import BildGenerator from './pages/BildGenerator'
import Analysen from './pages/Analysen'
import WorkflowAutomation from './pages/WorkflowAutomation'
import Whiteboards from './pages/Whiteboards'
import Vorlagen from './pages/Vorlagen'
import Dokumente from './pages/Dokumente'
import Ordner from './pages/Ordner'
import Marktplatz from './pages/Marktplatz'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="projekte" element={<Projects />} />
        <Route path="ki-editor" element={<KiEditor />} />
        <Route path="mindmaps" element={<Mindmaps />} />
        <Route path="ki-chat" element={<KiChat />} />
        <Route path="bild-generator" element={<BildGenerator />} />
        <Route path="analysen" element={<Analysen />} />
        <Route path="workflow-automation" element={<WorkflowAutomation />} />
        <Route path="whiteboards" element={<Whiteboards />} />
        <Route path="vorlagen" element={<Vorlagen />} />
        <Route path="dokumente" element={<Dokumente />} />
        <Route path="ordner" element={<Ordner />} />
        <Route path="marktplatz" element={<Marktplatz />} />
      </Route>
    </Routes>
  )
}
