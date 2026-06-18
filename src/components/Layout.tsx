import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import RightSidebar from './RightSidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64 mr-80 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <RightSidebar />
    </div>
  )
}
