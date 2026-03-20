import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Search, Eye, RefreshCw, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";

const TYPE_LABELS = {
  new: "New Booking",
  update: "Update",
  cancellation: "Cancellation",
  rates_request: "Rates Request",
};

const TYPE_COLORS = {
  new: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  cancellation: "bg-red-100 text-red-800",
  rates_request: "bg-purple-100 text-purple-800",
};

const RECIPIENT_COLORS = {
  admin: "bg-slate-100 text-slate-700",
  agency: "bg-yellow-100 text-yellow-800",
  client: "bg-teal-100 text-teal-800",
};

const STATUS_ICONS = {
  sent: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  skipped: <MinusCircle className="w-4 h-4 text-slate-400" />,
};

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRecipient, setFilterRecipient] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    const data = await base44.entities.EmailLog.list("-created_date", 200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.recipient?.toLowerCase().includes(search.toLowerCase()) ||
      log.subject?.toLowerCase().includes(search.toLowerCase()) ||
      log.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || log.booking_type === filterType;
    const matchStatus = filterStatus === "all" || log.status === filterStatus;
    const matchRecipient = filterRecipient === "all" || log.recipient_type === filterRecipient;
    return matchSearch && matchType && matchStatus && matchRecipient;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">Email Logs</h1>
          <Badge variant="outline" className="text-slate-500">{filtered.length} emails</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by recipient, subject, client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="new">New Booking</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="cancellation">Cancellation</SelectItem>
            <SelectItem value="rates_request">Rates Request</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRecipient} onValueChange={setFilterRecipient}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Recipient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All recipients</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Mail className="w-10 h-10 mb-3 opacity-30" />
            <p>No emails found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Recipient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">To</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Site</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {log.created_date ? format(new Date(log.created_date), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[log.booking_type] || 'bg-slate-100 text-slate-600'}`}>
                      {TYPE_LABELS[log.booking_type] || log.booking_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RECIPIENT_COLORS[log.recipient_type] || 'bg-slate-100 text-slate-600'}`}>
                      {log.recipient_type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{log.recipient}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">{log.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{log.client_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{log.site_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICONS[log.status]}
                      <span className={`text-xs ${log.status === 'failed' ? 'text-red-600' : log.status === 'skipped' ? 'text-slate-400' : 'text-green-600'}`}>
                        {log.status}
                      </span>
                    </div>
                    {log.status === 'failed' && log.error_message && (
                      <p className="text-xs text-red-400 mt-0.5 truncate max-w-[120px]">{log.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)} className="h-7 w-7">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">To:</span> <span className="font-medium">{selectedLog.recipient}</span></div>
                <div><span className="text-slate-500">Type:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selectedLog.booking_type]}`}>{TYPE_LABELS[selectedLog.booking_type]}</span></div>
                <div><span className="text-slate-500">Recipient type:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RECIPIENT_COLORS[selectedLog.recipient_type]}`}>{selectedLog.recipient_type}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className="flex items-center gap-1">{STATUS_ICONS[selectedLog.status]} {selectedLog.status}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Subject:</span> <span className="font-medium">{selectedLog.subject}</span></div>
                {selectedLog.client_name && <div><span className="text-slate-500">Client:</span> {selectedLog.client_name}</div>}
                {selectedLog.site_name && <div><span className="text-slate-500">Site:</span> {selectedLog.site_name}</div>}
                {selectedLog.created_date && <div className="col-span-2"><span className="text-slate-500">Sent at:</span> {format(new Date(selectedLog.created_date), 'dd MMM yyyy HH:mm:ss')}</div>}
              </div>
              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  <strong>Error:</strong> {selectedLog.error_message}
                </div>
              )}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 border-b">Email content</div>
                <div
                  className="p-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedLog.body || '<em>No content</em>' }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}