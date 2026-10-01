import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, CheckCircle, Clock, AlertCircle, MessageSquare } from "lucide-react";
import api from "../../utils/api";

export default function SuperAdminSupportInbox() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get("/support/tickets");
      setTickets(res.data.data);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus, reply = "") => {
    setIsUpdating(true);
    try {
      await api.patch(`/support/tickets/${ticketId}`, {
        status: newStatus,
        adminReply: reply,
      });
      setSelectedTicket(null);
      setReplyText("");
      fetchTickets(); // Refresh list
    } catch (err) {
      console.error("Failed to update ticket:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-bold"><Clock className="w-3 h-3" /> Pending</span>;
      case "in_progress": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold"><AlertCircle className="w-3 h-3" /> In Progress</span>;
      case "resolved": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default: return null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading Inbox...</p></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-brand" /> Support Inbox
            </h1>
            <p className="text-muted-foreground">Manage bug reports and feedback from students and admins.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">All Tickets ({tickets.length})</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {tickets.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition ${selectedTicket?._id === ticket._id ? "bg-brand/5 border-l-4 border-l-brand" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-foreground line-clamp-1">{ticket.subject}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">From: {ticket.userName} ({ticket.userRole})</p>
                    <p className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6">
            {selectedTicket ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedTicket.subject}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted by <span className="font-medium text-foreground">{selectedTicket.userName}</span> ({selectedTicket.userRole}) on {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.message}</p>
                  {(selectedTicket.contactEmail || selectedTicket.contactPhone) && (
                    <div className="pt-3 border-t border-border flex flex-wrap gap-4 text-sm">
                      {selectedTicket.contactEmail && (
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-4 h-4" /> {selectedTicket.contactEmail}</span>
                      )}
                      {selectedTicket.contactPhone && (
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-4 h-4" /> {selectedTicket.contactPhone}</span>
                      )}
                    </div>
                  )}
                </div>

                {selectedTicket.adminReply && (
                  <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-brand mb-1">Your Previous Reply:</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply or internal note here..."
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateTicketStatus(selectedTicket._id, "in_progress", replyText)}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={isUpdating}
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateTicketStatus(selectedTicket._id, "resolved", replyText)}
                      className="flex-1 rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
                      disabled={isUpdating}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p>Select a ticket from the list to view details and reply.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
