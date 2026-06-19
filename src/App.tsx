import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import KiEditor from './pages/KiEditor'
import Mindmaps from './pages/Mindmaps'
import KiChat from './pages/KiChat'
import BildGenerator from './pages/BildGenerator'
import VideoGenerator from './pages/VideoGenerator'
import MusikGenerator from './pages/MusikGenerator'
import Analysen from './pages/Analysen'
import WorkflowAutomation from './pages/WorkflowAutomation'
import Whiteboards from './pages/Whiteboards'
import Vorlagen from './pages/Vorlagen'
import Dokumente from './pages/Dokumente'
import Ordner from './pages/Ordner'
import Marktplatz from './pages/Marktplatz'
import Verbindungen from './pages/Verbindungen'
import Profil from './pages/Profil'
import Einstellungen from './pages/Einstellungen'

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
        <Route path="video-generator" element={<VideoGenerator />} />
        <Route path="musik-generator" element={<MusikGenerator />} />
        <Route path="analysen" element={<Analysen />} />
        <Route path="workflow-automation" element={<WorkflowAutomation />} />
        <Route path="whiteboards" element={<Whiteboards />} />
        <Route path="vorlagen" element={<Vorlagen />} />
        <Route path="dokumente" element={<Dokumente />} />
        <Route path="ordner" element={<Ordner />} />
        <Route path="marktplatz" element={<Marktplatz />} />
        <Route path="verbindungen" element={<Verbindungen />} />
        <Route path="profil" element={<Profil />} />
        <Route path="einstellungen" element={<Einstellungen />} />
      </Route>
    </Routes>
  )
}
