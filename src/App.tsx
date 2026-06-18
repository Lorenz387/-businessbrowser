import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RightSidebar from './components/RightSidebar';
import CreateProjectModal from './components/CreateProjectModal';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import KIChat from './pages/KIChat';
import KIEditor from './pages/KIEditor';
import Mindmaps from './pages/Mindmaps';
import Whiteboards from './pages/Whiteboards';
import WorkflowAutomation from './pages/WorkflowAutomation';
import BildGenerator from './pages/BildGenerator';
import VideoGenerator from './pages/VideoGenerator';
import MusikGenerator from './pages/MusikGenerator';
import Analysen from './pages/Analysen';
import Vorlagen from './pages/Vorlagen';
import Dokumente from './pages/Dokumente';
import Ordner from './pages/Ordner';
import Verbindungen from './pages/Verbindungen';
import Marktplatz from './pages/Marktplatz';
import { store, Project } from './store';

// Determine if a page needs right sidebar
const FULL_PAGES = ['/ki-editor', '/ki-chat', '/mindmaps', '/whiteboards'];

function AppContent() {
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (_p: Project) => setRefreshKey(k => k + 1);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onCreateProject={() => setShowCreate(true)} />
        <div className="flex-1 flex overflow-hidden">
          <Routes>
            <Route path="/" element={
              <div className="flex flex-1 overflow-hidden">
                <Dashboard onCreateProject={() => setShowCreate(true)} refreshKey={refreshKey} />
                <RightSidebar />
              </div>
            } />
            <Route path="/projekte" element={<Projects onCreateProject={() => setShowCreate(true)} refreshKey={refreshKey} />} />
            <Route path="/projekte/:id" element={<Projects onCreateProject={() => setShowCreate(true)} refreshKey={refreshKey} />} />
            <Route path="/ki-chat" element={<KIChat />} />
            <Route path="/ki-editor" element={<KIEditor />} />
            <Route path="/mindmaps" element={<Mindmaps />} />
            <Route path="/whiteboards" element={<Whiteboards />} />
            <Route path="/workflow-automation" element={<WorkflowAutomation />} />
            <Route path="/bild-generator" element={<BildGenerator />} />
            <Route path="/video-generator" element={<VideoGenerator />} />
            <Route path="/musik-generator" element={<MusikGenerator />} />
            <Route path="/analysen" element={<Analysen />} />
            <Route path="/vorlagen" element={<Vorlagen />} />
            <Route path="/dokumente" element={<Dokumente />} />
            <Route path="/ordner" element={<Ordner />} />
            <Route path="/verbindungen" element={<Verbindungen />} />
            <Route path="/marktplatz" element={<Marktplatz />} />
            <Route path="*" element={
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-5xl mb-3">🔍</div>
                  <p className="text-lg font-medium text-gray-600">Seite nicht gefunden</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </div>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
