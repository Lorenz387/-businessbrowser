import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import Layout from './components/Layout.jsx'
import { Button, ErrorState, Loading, PageHeader } from './components/ui.jsx'
import { Landing, Login, Register } from './pages/Public.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Home, { Weekly } from './pages/Home.jsx'
import { GoalsList, GoalNew, GoalDetail } from './pages/Goals.jsx'
import { Learn, LessonView } from './pages/Learn.jsx'
import { Practice, PracticeSession } from './pages/Practice.jsx'
import { Missions, MissionView } from './pages/Missions.jsx'
import { Projects, ProjectView } from './pages/Projects.jsx'
import { Skills, SkillView } from './pages/Skills.jsx'
import { Career, CareerPathView } from './pages/Career.jsx'
import { Knowledge, KnowledgeItemView, DocumentView, ResearchView } from './pages/Knowledge.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Junis from './pages/Junis.jsx'
import { Settings, Account, Billing } from './pages/Settings.jsx'
import { Business, OrgView } from './pages/Business.jsx'
import { Creator, CreatorItemEditor, Marketplace, MarketplaceItem } from './pages/Creator.jsx'
import { Legal, Help } from './pages/Legal.jsx'

function NotFound() {
  return (
    <div className="py-16">
      <PageHeader title="Diese Seite gibt es nicht." subtitle="Der Link ist möglicherweise veraltet oder falsch." />
      <Button to="/" variant="primary">Zur Startseite</Button>
    </div>
  )
}

export default function App() {
  const { user, loading, error, refresh } = useAuth()
  const location = useLocation()

  if (loading) return <Loading label="JunisWorld wird geladen …" />
  if (error && !user) return <div className="max-w-lg mx-auto p-6 mt-20"><ErrorState error={error} what="JunisWorld" onRetry={refresh} /></div>

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/legal/:page" element={<Legal standalone />} />
        <Route path="/help" element={<Help standalone />} />
        <Route path="*" element={<Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />} />
      </Routes>
    )
  }

  if (!user.onboarded) {
    return (
      <Routes>
        <Route path="/legal/:page" element={<Legal standalone />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="weekly" element={<Weekly />} />
        <Route path="goals" element={<GoalsList />} />
        <Route path="goals/new" element={<GoalNew />} />
        <Route path="goals/:id" element={<GoalDetail />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/lessons/:id" element={<LessonView />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/:id" element={<PracticeSession />} />
        <Route path="missions" element={<Missions />} />
        <Route path="missions/:id" element={<MissionView />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectView />} />
        <Route path="skills" element={<Skills />} />
        <Route path="skills/:id" element={<SkillView />} />
        <Route path="career" element={<Career />} />
        <Route path="career/:id" element={<CareerPathView />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="knowledge/documents/:id" element={<DocumentView />} />
        <Route path="knowledge/research/:id" element={<ResearchView />} />
        <Route path="knowledge/:id" element={<KnowledgeItemView />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="junis" element={<Junis />} />
        <Route path="junis/:id" element={<Junis />} />
        <Route path="settings" element={<Settings />} />
        <Route path="account" element={<Account />} />
        <Route path="billing" element={<Billing />} />
        <Route path="business" element={<Business />} />
        <Route path="business/:id" element={<OrgView />} />
        <Route path="creator" element={<Creator />} />
        <Route path="creator/:id" element={<CreatorItemEditor />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="marketplace/:id" element={<MarketplaceItem />} />
        <Route path="legal/:page" element={<Legal />} />
        <Route path="help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
