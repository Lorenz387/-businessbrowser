import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import GeneratePage from './pages/GeneratePage'
import EditPage from './pages/EditPage'
import GalleryPage from './pages/GalleryPage'
import { loadGallery } from './store/videoStore'

const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

export default function App() {
  const [page, setPage] = useState('generate')
  const [gallery, setGallery] = useState(() => loadGallery())
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [queue, setQueue] = useState([])

  const refreshGallery = () => setGallery(loadGallery())

  const handleSelectVideo = (v) => {
    setSelectedVideo(v)
    setPage('gallery')
  }

  const renderPage = () => {
    switch (page) {
      case 'generate':
        return <GeneratePage onVideoCreated={refreshGallery} />
      case 'edit':
        return <EditPage />
      case 'gallery':
        return <GalleryPage gallery={gallery} onUpdate={setGallery} favoritesOnly={false} />
      case 'favorites':
        return <GalleryPage gallery={gallery} onUpdate={setGallery} favoritesOnly={true} />
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-white/20 text-sm">Coming soon</div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-violet-900/15 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-purple-900/10 blur-3xl" />
      </div>

      <Sidebar active={page} onChange={setPage} />

      <main className="ml-52 mr-56 min-h-screen px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={page} {...pageMotion}>
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <RightPanel gallery={gallery} queue={queue} onSelect={handleSelectVideo} />
    </div>
  )
}
