import { useState } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, Phone, Clock, Play, X, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { mockCallLogs, mockEndReasons, CallLog } from '@/data/mockData'
import { formatDuration, formatDateTime } from '@/lib/utils'

export default function CallHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endReasonFilter, setEndReasonFilter] = useState('all')
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const callsPerPage = 25

  // Filter calls based on all criteria
  const filteredCalls = mockCallLogs.filter((call: CallLog) => {
    // Search filter
    if (searchQuery && !call.callerNumber.includes(searchQuery.replace(/\D/g, ''))) {
      return false
    }
    
    // Date range filter
    if (startDate) {
      const callDate = new Date(call.callStartedAt)
      const start = new Date(startDate)
      if (callDate < start) return false
    }
    if (endDate) {
      const callDate = new Date(call.callStartedAt)
      const end = new Date(endDate)
      end.setHours(23, 59, 59) // Include the entire end day
      if (callDate > end) return false
    }
    
    // End reason filter
    if (endReasonFilter !== 'all' && call.endReason !== endReasonFilter) {
      return false
    }
    
    return true
  })

  const toggleExpand = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
        <p className="text-gray-500 mt-1">View and search all calls handled by your receptionist</p>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone number..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="pl-10 w-40"
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="pl-10 w-40"
                />
              </div>
            </div>
            
            {/* End Reason Filter */}
            <div className="relative min-w-[180px]">
              <select
                value={endReasonFilter}
                onChange={(e) => setEndReasonFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {mockEndReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            
            {/* Clear Filters */}
            {(searchQuery || startDate || endDate || endReasonFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setStartDate('')
                  setEndDate('')
                  setEndReasonFilter('all')
                }}
                className="border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Call Log Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Date/Time</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Caller</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Duration</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Tools Used</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">End Reason</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCalls.map((call: CallLog) => (
                  <>
                    <tr 
                      key={call.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(call.id)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDateTime(call.callStartedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{call.callerNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatDuration(call.durationSeconds)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {call.toolsUsed.split(', ').map((tool, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          call.endReason === 'customer-ended-call' ? 'bg-green-100 text-green-800' :
                          call.endReason === 'assistant-ended-call' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {call.endReason.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {expandedCall === call.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                    </tr>
                    {expandedCall === call.id && (
                      <tr key={`${call.id}-expanded`}>
                        <td colSpan={6} className="bg-gray-50 px-6 py-6">
                          <div className="max-w-4xl">
                            {/* Summary */}
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                              <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200">
                                {call.summary || 'Summary not available'}
                              </p>
                            </div>

                            {/* Transcript */}
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Transcript</h4>
                              {call.transcript ? (
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-600 whitespace-pre-wrap font-mono">
                                  {call.transcript}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200">
                                  Transcripts are not enabled for this assistant. Contact support to enable.
                                </p>
                              )}
                            </div>

                            {/* Recording */}
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Recording</h4>
                              {call.recordingUrl ? (
                                <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
                                  <button className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center">
                                    <Play className="w-4 h-4 ml-0.5" />
                                  </button>
                                  <span className="text-sm text-gray-600">Click to play recording</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 opacity-50">
                                  <button className="w-10 h-10 rounded-full bg-gray-300 text-white flex items-center justify-center cursor-not-allowed">
                                    <Play className="w-4 h-4 ml-0.5" />
                                  </button>
                                  <span className="text-sm text-gray-500">Recording not available</span>
                                </div>
                              )}
                            </div>

                            {/* Call Metadata */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Call Metadata</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                                <div>
                                  <p className="text-xs text-gray-500">Call ID</p>
                                  <p className="text-sm text-gray-900 font-mono">{call.id}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Start Time</p>
                                  <p className="text-sm text-gray-900">{formatDateTime(call.callStartedAt)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Duration</p>
                                  <p className="text-sm text-gray-900">{formatDuration(call.durationSeconds)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Inbound Number</p>
                                  <p className="text-sm text-gray-900">+1 (989) 295-5900</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredCalls.length === 0 && (
        <div className="text-center py-12">
          <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  )
}

