import { useNavigate } from 'react-router-dom'
import { Bot, Phone, CalendarCheck, ArrowRight, Loader2 } from 'lucide-react'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AssistantSelector() {
  const navigate = useNavigate()
  const { assistants, setSelectedAssistant, isLoadingAssistants } = useAssistant()
  const { signOut } = useAuth()

  // Loading state
  if (isLoadingAssistants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading assistants...</span>
        </div>
      </div>
    )
  }

  // No assistants found
  if (assistants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700 mb-4">
            <Bot className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Assistants Found</h2>
          <p className="text-slate-400 mb-6">
            Your account is set up, but no assistants have been configured yet.
            Contact support to get your receptionist set up.
          </p>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  // If only one assistant, skip to dashboard directly
  if (assistants.length === 1) {
    setSelectedAssistant(assistants[0])
    navigate('/dashboard')
    return null
  }

  const handleSelectAssistant = (assistant: typeof assistants[0]) => {
    setSelectedAssistant(assistant)
    navigate('/dashboard')
  }

  // Format phone number for display
  const formatPhone = (number: string) => {
    // If already formatted, return as-is
    if (number.includes('(')) return number
    // Format +19895551234 → +1 (989) 555-1234
    const digits = number.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return number
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Master Receptionists</h1>
              <p className="text-xs text-slate-400">Automated Reception Services</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-400 hover:text-white"
            onClick={signOut}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Assistant Cards */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-medium text-slate-300 mb-4">Select an Assistant</h2>
        <p className="text-sm text-slate-400 mb-6">
          Choose an assistant to view its dashboard and settings
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assistants.map((assistant) => (
            <Card
              key={assistant.assistant_id}
              className="bg-slate-800/50 border-slate-700 hover:border-purple-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/20 group"
              onClick={() => handleSelectAssistant(assistant)}
            >
              <CardContent className="p-6">
                {/* Status & Plan */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${assistant.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-sm ${assistant.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {assistant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {assistant.tier_name && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {assistant.tier_name}
                    </span>
                  )}
                </div>

                {/* Name & Number */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {assistant.assistant_name || 'AI Receptionist'}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{formatPhone(assistant.inbound_number)}</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs">Calls this month</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{assistant.totalCallsThisMonth}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <CalendarCheck className="w-4 h-4" />
                      <span className="text-xs">Bookings this month</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{assistant.totalBookingsThisMonth}</p>
                  </div>
                </div>

                {/* Select Button */}
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 group-hover:shadow-lg group-hover:shadow-purple-500/25"
                >
                  View Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}