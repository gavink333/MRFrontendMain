import { useState, useEffect } from 'react'
import { Phone, Shield, Bell, User, Copy, Trash2, Plus, AlertCircle, Sparkles, CheckCircle2, Loader2, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'


// ============================================================
// TYPES
// ============================================================

interface NotificationRule {
  id: number
  tool_name: string
  channel: string
  is_enabled: boolean
  label: string | null
  recipient_name: string | null
}

interface PricingTier {
  tier_name: string
  billing_unit_time: string
  subscription_fee: number | null
  min_minutes: number | null
  max_minutes: number | null
  is_active: boolean
}

// ============================================================
// HELPERS
// ============================================================

const toolNameToLabel: Record<string, string> = {
  'book_appointment': 'New Booking',
  'cancel_appointment': 'Cancellation',
  'reschedule_appointment': 'Reschedule',
  'get_availability': 'Availability Check',
}

function formatPhone(number: string): string {
  if (!number) return 'Unknown'
  if (number.includes('(')) return number
  const digits = number.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return number
}

// ============================================================
// COMPONENT
// ============================================================

export default function Settings() {
  const { selectedAssistant, refreshAssistants } = useAssistant()
  const { user, orgId, signOut, resetPassword } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Subscription
  const [pricingTier, setPricingTier] = useState<PricingTier | null>(null)

  // Block list
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([])
  const [countryCode, setCountryCode] = useState('+1')
  const [areaCode, setAreaCode] = useState('')
  const [number, setNumber] = useState('')

  // Notifications
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([])

  // Org name
  const [orgName, setOrgName] = useState<string>('')
  
  // Change Name
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')

  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const [pendingActiveState, setPendingActiveState] = useState<boolean | null>(null)

  // ----------------------------------------------------------
  // Fetch all settings data
  // ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || !selectedAssistant) return

    async function fetchSettings() {
      setIsLoading(true)
      const assistantId = selectedAssistant!.assistant_id

      try {
        const [pricingResult, notifResult, orgResult] = await Promise.all([
          // Pricing tier
          supabase
            .from('org_assistant_pricing_tiers')
            .select('tier_name, billing_unit_time, subscription_fee, min_minutes, max_minutes, is_active')
            .eq('org_id', orgId!)
            .eq('is_active', true)
            .or(`assistant_id.eq.${assistantId},assistant_id.is.null`)
            .order('assistant_id', { ascending: false, nullsFirst: false })
            .limit(1),

          // Notification rules for this assistant
          supabase
            .from('notification_config')
            .select('id, tool_name, channel, is_enabled, label, recipient_name')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId),

          // Org name
          supabase
            .from('organization_config')
            .select('org_name')
            .eq('org_id', orgId!)
            .limit(1)
            .maybeSingle(),
        ])

        setPricingTier(pricingResult.data?.[0] || null)
        setNotificationRules(notifResult.data || [])
        setOrgName(orgResult.data?.org_name || '')

        // Block list from the assistant context (already fetched)
        setBlockedNumbers(selectedAssistant!.block_list || [])

      } catch (err) {
        console.error('Error fetching settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    setTimeout(() => { fetchSettings() }, 0)
  }, [orgId, selectedAssistant])

  // ----------------------------------------------------------
  // Block list handlers
  // ----------------------------------------------------------
  const handleAddBlockedNumber = async () => {
    if (!selectedAssistant) return
    const cleanCountry = countryCode.replace(/[^0-9+]/g, '')
    if (cleanCountry && areaCode.length === 3 && number.length === 7) {
      const fullNumber = `${cleanCountry}${areaCode}${number}`
      if (blockedNumbers.includes(fullNumber)) return

      const updatedList = [...blockedNumbers, fullNumber]

      try {
        const { error } = await supabase
          .from('assistant_config')
          .update({ block_list: updatedList })
          .eq('assistant_id', selectedAssistant.assistant_id)

        if (error) throw error

        setBlockedNumbers(updatedList)
        setAreaCode('')
        setNumber('')
        setSaveMessage({ type: 'success', text: 'Number added to block list' })
        setTimeout(() => setSaveMessage(null), 3000)
      } catch (err) {
        console.error('Error adding blocked number:', err)
        setSaveMessage({ type: 'error', text: 'Failed to add number' })
      }
    }
  }

  const handleRemoveBlockedNumber = async (num: string) => {
    if (!selectedAssistant) return
    const confirmed = window.confirm(`Remove ${formatPhone(num)} from the block list?`)
    if (!confirmed) return

    const updatedList = blockedNumbers.filter(n => n !== num)

    try {
      const { error } = await supabase
        .from('assistant_config')
        .update({ block_list: updatedList })
        .eq('assistant_id', selectedAssistant.assistant_id)

      if (error) throw error

      setBlockedNumbers(updatedList)
      setSaveMessage({ type: 'success', text: 'Number removed from block list' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error removing blocked number:', err)
      setSaveMessage({ type: 'error', text: 'Failed to remove number' })
    }
  }

  // ----------------------------------------------------------
  // Notification handlers
  // ----------------------------------------------------------
  const handleToggleNotification = async (rule: NotificationRule) => {
    const newValue = !rule.is_enabled

    try {
      const { error } = await supabase
        .from('notification_config')
        .update({ is_enabled: newValue })
        .eq('id', rule.id)

      if (error) throw error

      setNotificationRules(prev =>
        prev.map(r => r.id === rule.id ? { ...r, is_enabled: newValue } : r)
      )
    } catch (err) {
      console.error('Error toggling notification:', err)
    }
  }

  // ----------------------------------------------------------
  // Account handlers
  // ----------------------------------------------------------
  const handleChangePassword = async () => {
    if (!user?.email) return
    const { error } = await resetPassword(user.email)
    if (error) {
      setSaveMessage({ type: 'error', text: error })
    } else {
      setSaveMessage({ type: 'success', text: 'Password reset email sent! Check your inbox.' })
    }
    setTimeout(() => setSaveMessage(null), 5000)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSaveMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setSaveMessage(null), 2000)
  }



  // ----------------------------------------------------------
  // Assistant Active/Inactive Toggle Handler
  // ----------------------------------------------------------

  const handleToggleAssistantActive = (newValue: boolean) => {
    setPendingActiveState(newValue)
    setShowToggleConfirm(true)
  }

  const confirmToggleAssistant = async () => {
    if (!selectedAssistant || pendingActiveState === null) return
    setShowToggleConfirm(false)

    try {
      const { error } = await supabase
        .from('assistant_config')
        .update({ is_active: pendingActiveState })
        .eq('assistant_id', selectedAssistant.assistant_id)

      if (error) throw error

      await refreshAssistants()

      setSaveMessage({
        type: 'success',
        text: pendingActiveState ? 'Assistant activated successfully!' : 'Assistant deactivated.'
      })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error toggling assistant:', err)
      setSaveMessage({ type: 'error', text: 'Failed to update assistant status.' })
    }
    setPendingActiveState(null)
  }



  // ----------------------------------------------------------
  // Save Handler
  // ----------------------------------------------------------
  const handleSaveName = async () => {
    if (!selectedAssistant) return

    try {
      const { error } = await supabase
        .from('assistant_config')
        .update({ assistant_name: editName.trim() || null })
        .eq('assistant_id', selectedAssistant.assistant_id)

      if (error) throw error

      setIsEditingName(false)
      await refreshAssistants()

      setSaveMessage({ type: 'success', text: 'Assistant name updated!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error updating name:', err)
      setSaveMessage({ type: 'error', text: 'Failed to update name.' })
    }
  }

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  if (isLoading || !selectedAssistant) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Save Message Toast */}
      {saveMessage && (
        <div className={`mb-6 p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {saveMessage.text}
        </div>
      )}

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
                  <p className="text-xl font-bold text-gray-900">
                    {pricingTier?.tier_name || selectedAssistant.tier_name || 'No plan assigned'}
                  </p>
                  {pricingTier && pricingTier.subscription_fee != null && (
                  <p className="text-sm text-gray-600 mt-1">
                    ${Number(pricingTier.subscription_fee).toLocaleString()}/{pricingTier.billing_unit_time === 'yearly' ? 'yr' : pricingTier.billing_unit_time === 'quarterly' ? 'qtr' : pricingTier.billing_unit_time === 'weekly' ? 'wk' : pricingTier.billing_unit_time === 'biweekly' ? '(2 wk)' : 'mo'}
                    {pricingTier.billing_unit_time === 'yearly' ? (
                      <span className="text-gray-400 ml-1">
                        (${Math.round(Number(pricingTier.subscription_fee) / 12).toLocaleString()}/mo)
                      </span>
                    ) : null}
                  </p>
                )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  {pricingTier?.min_minutes && pricingTier?.max_minutes ? (
                    <>
                      <p className="text-sm text-gray-500">Included Minutes</p>
                      <p className="text-sm font-medium text-gray-900">
                        {pricingTier.min_minutes.toLocaleString()}–{pricingTier.max_minutes.toLocaleString()} min
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Billing Cycle</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {pricingTier?.billing_unit_time || selectedAssistant.billing_unit_time || '—'}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assistant Management */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Assistant Management
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${selectedAssistant.is_active ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedAssistant.is_active ? 'Active' : 'Inactive'}
                </span>
                <Switch
                  checked={selectedAssistant.is_active}
                  onCheckedChange={handleToggleAssistantActive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              {/* Assistant Name (editable) */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                        className="w-48 h-8 text-sm"
                        placeholder="Assistant name"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-purple-600 hover:bg-purple-700 text-xs"
                        onClick={handleSaveName}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setIsEditingName(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedAssistant.assistant_name || 'Unnamed Assistant'}
                      </p>
                      <button
                        onClick={() => {
                          setEditName(selectedAssistant.assistant_name || '')
                          setIsEditingName(true)
                        }}
                        className="p-1 text-gray-400 hover:text-purple-600"
                        title="Edit name"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedAssistant.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedAssistant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Assistant ID */}
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-gray-500">ID:</p>
                <p className="text-xs text-gray-500 font-mono">{selectedAssistant.assistant_id}</p>
                <button
                  onClick={() => copyToClipboard(selectedAssistant.assistant_id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Inbound Number</p>
                  <p className="text-sm font-medium text-gray-900">{formatPhone(selectedAssistant.inbound_number)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Call Logging</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAssistant.call_logging_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transcripts</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAssistant.transcripts_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Summaries</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAssistant.summary_enabled ? 'Enabled' : 'Disabled'}
                  </p>
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
                    <span className="text-sm text-gray-900">{formatPhone(num)}</span>
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
            {notificationRules.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No notification rules configured. Contact support to set up notifications.</p>
            ) : (
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
                        <td className="py-3 text-sm text-gray-900">
                          {toolNameToLabel[rule.tool_name] || rule.tool_name}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            rule.channel === 'pushover' ? 'bg-orange-100 text-orange-800' :
                            rule.channel === 'slack' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rule.channel === 'pushover' ? 'Pushover' :
                             rule.channel === 'slack' ? 'Slack' :
                             rule.channel}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-600">
                          {rule.recipient_name || rule.label || '—'}
                        </td>
                        <td className="py-3">
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={() => handleToggleNotification(rule)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <p className="text-sm font-medium text-gray-900">{user?.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Organization</p>
                  <p className="text-sm font-medium text-gray-900">{orgName || '—'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="border-gray-300" onClick={handleChangePassword}>
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Assistant Confirmation Modal */}
        {showToggleConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pendingActiveState ? 'Activate Assistant?' : 'Deactivate Assistant?'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {pendingActiveState
                  ? 'This will turn the assistant back on. It will resume handling all incoming calls immediately.'
                  : 'This will turn off the assistant. It will NOT be able to handle any calls while deactivated. All incoming calls will go unanswered until you turn it back on.'}
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowToggleConfirm(false)
                    setPendingActiveState(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className={pendingActiveState ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  onClick={confirmToggleAssistant}
                >
                  {pendingActiveState ? 'Yes, Activate' : 'Yes, Deactivate'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}