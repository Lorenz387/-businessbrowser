import { useState } from 'react';
import { Bell, Plus, ChevronDown, User, Settings, LogOut, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store';

interface Props {
  onCreateProject: () => void;
}

export default function Header({ onCreateProject }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const notifications = store.getNotifications();
  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    store.saveNotifications(updated);
    setShowNotifications(false);
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
        <span className="font-bold text-gray-800">LifeOS AI</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreateProject}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Erstellen
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} className="text-gray-600" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800">Benachrichtigungen</span>
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Check size={12} /> Alle gelesen
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">{n.avatar}</div>
                    <div>
                      <p className={`text-sm ${!n.read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">E</div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-700">Elias</div>
              <div className="text-xs text-blue-600 font-medium">Pro Plan</div>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
              <button onClick={() => { navigate('/profil'); setShowProfile(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User size={15} /> Profil
              </button>
              <button onClick={() => { navigate('/einstellungen'); setShowProfile(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Settings size={15} /> Einstellungen
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={15} /> Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
