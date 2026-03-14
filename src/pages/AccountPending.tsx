import { Bot, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AccountPending() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Master Receptionists</h1>
          <p className="text-slate-400 mt-2">Automated Reception Services</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-yellow-500" />
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-4">Account Pending</h2>
          
          <p className="text-slate-400 mb-6">
            Your account is being set up. We'll notify you when your dashboard is ready.
          </p>
          
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-400">
              Need help? Contact us at{' '}
              <a 
                href="mailto:support@masterreceptionists.com" 
                className="text-purple-400 hover:text-purple-300"
              >
                support@masterreceptionists.com
              </a>
            </p>
          </div>

          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => window.location.href = '/login'}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
