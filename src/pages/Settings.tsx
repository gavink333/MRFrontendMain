import { useState } from 'react'
import { Phone, Shield, Bell, User, Copy, Trash2, Plus, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { mockUser, mockBlockedNumbers, mockNotificationRules, mockAssistantInfo, mockSubscriptionPlan } from '@/data/mockData'
import { useAssistant } from '@/context/AssistantContext'

export default function Settings() {
  const { selectedAssistant } = useAssistant()
  const [blockedNumbers, setBlockedNumbers] = useState(mockBlockedNumbers)
  const [countryCode, setCountryCode] = useState('+1')
  const [areaCode, setAreaCode] = useState('')
  const [number, setNumber] = useState('')
  const [notificationRules, setNotificationRules] = useState(mockNotificationRules)

  const handleAddBlockedNumber = () => {
    if (countryCode && areaCode.length === 3 && number.length === 7) {
      const fullNumber = `${countryCode}${areaCode}${number}`
      if (!blockedNumbers.includes(fullNumber)) {
        setBlockedNumbers([...blockedNumbers, fullNumber])
        setAreaCode('')
        setNumber('')
      }
    }
  }

  const handleRemoveBlockedNumber = (num: string) => {
    setBlockedNumbers(blockedNumbers.filter(n => n !== num))
  }

  const handleToggleNotification = (id: number) => {
    setNotificationRules(rules => 
      rules.map(rule => rule.id === id ? { ...rule, isEnabled: !rule.isEnabled } : rule)
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Subscription Plan Card */}
        <Card className="border-gray-200 shadow-sm bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subscription Plan</p>
                  <p className="text-xl font-bold text-gray-900">{mockSubscriptionPlan.planName}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Billing Cycle</p>
                  <p className="text-sm font-medium text-gray-900">{mockSubscriptionPlan.billingCycle}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{mockSubscriptionPlan.status}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assistant Management */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Assistant Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">Assistant ID</p>
                    <button 
                      onClick={() => copyToClipboard(mockAssistantInfo.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{mockAssistantInfo.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-gray-900">{mockAssistantInfo.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Inbound Number</p>
                  <p className="text-sm font-medium text-gray-900">{mockAssistantInfo.inboundNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Call Logging</p>
                  <p className="text-sm font-medium text-gray-900">{mockAssistantInfo.callLogging}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transcripts</p>
                  <p className="text-sm font-medium text-gray-900">{mockAssistantInfo.transcripts}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Summaries</p>
                  <p className="text-sm font-medium text-gray-900">{mockAssistantInfo.summaries}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 italic">
                Contact support to change assistant settings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Block List */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Block List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Blocked Numbers</p>
              <div className="flex flex-wrap gap-2">
                {blockedNumbers.map((num) => (
                  <div 
                    key={num} 
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <span className="text-sm text-gray-900">+{num}</span>
                    <button
                      onClick={() => handleRemoveBlockedNumber(num)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {blockedNumbers.length === 0 && (
                  <p className="text-sm text-gray-500">No blocked numbers</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-3">Add Number</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Country</Label>
                  <Input
                    value={countryCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountryCode(e.target.value)}
                    className="w-20 mt-1"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Area Code</Label>
                  <Input
                    value={areaCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="555"
                    className="w-24 mt-1"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Number</Label>
                  <Input
                    value={number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
                    placeholder="1234567"
                    className="w-32 mt-1"
                    maxLength={7}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddBlockedNumber}
                    disabled={areaCode.length !== 3 || number.length !== 7}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
              {areaCode.length !== 3 && areaCode.length > 0 && (
                <p className="text-xs text-red-500 mt-2">Area code must be 3 digits</p>
              )}
              {number.length !== 7 && number.length > 0 && (
                <p className="text-xs text-red-500 mt-2">Number must be 7 digits</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3">Event</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3">Channel</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3">Recipient</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notificationRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="py-3 text-sm text-gray-900">{rule.event}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          rule.channel === 'Pushover' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rule.channel}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{rule.recipient}</td>
                      <td className="py-3">
                        <Switch 
                          checked={rule.isEnabled} 
                          onCheckedChange={() => handleToggleNotification(rule.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                To set up new notification channels or change recipients, contact support.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{mockUser.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Organization</p>
                  <p className="text-sm font-medium text-gray-900">{mockUser.orgName}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="border-gray-300">
                  Change Password
                </Button>
                <Button variant="outline" className="border-gray-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300">
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
