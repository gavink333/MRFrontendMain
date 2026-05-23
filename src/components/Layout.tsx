import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Phone, 
  Calendar, 
  Settings, 
  ChevronDown,
  LogOut,
  User,
  Bot,
  ArrowLeft
} from 'lucide-react'
import { useState } from 'react'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calls', label: 'Call History', icon: Phone },
  { path: '/calendars', label: 'Calendars', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function formatPhone(number: string): string {
  if (!number) return ''
  if (number.includes('(')) return number
  const digits = number.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return number
}

export default function Layout() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { selectedAssistant } = useAssistant()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Master</h1>
              <p className="text-xs text-slate-400">Receptionists</p>
            </div>
          </div>
        </div>

        {/* Back to Assistants */}
        <div className="px-4 py-3 border-b border-slate-800">
          <a 
            href="/assistants"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assistants
          </a>
        </div>

        {/* Assistant Info */}
        {selectedAssistant && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Current Assistant</p>
            <p className="text-sm font-medium mb-1">
              {selectedAssistant.assistant_name || formatPhone(selectedAssistant.inbound_number)}
            </p>
            {selectedAssistant.tier_name && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {selectedAssistant.tier_name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-slate-800">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{user?.email || '—'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <NavLink
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </NavLink>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}