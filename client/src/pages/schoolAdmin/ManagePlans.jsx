import { useState, useEffect } from "react";
import { Search, CheckCircle, AlertCircle, Loader2, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function ManagePlans() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Stores userId of the button being clicked

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/super/users");
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (userId, newPlan, billingCycle) => {
    if (!window.confirm(`Are you sure you want to activate ${newPlan} (${billingCycle}) for this user?`)) return;
    
    setActionLoading(userId);
    try {
      const res = await api.post("/admin/super/activate-plan", { userId, newPlan, billingCycle });
      if (res.data.success) {
        alert(res.data.message);
        fetchUsers(); // Refresh the list
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to activate plan.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanColor = (plan) => {
    if (plan === 'free') return "bg-gray-100 text-gray-700";
    if (plan.includes('school')) return "bg-purple-100 text-purple-700";
    return "bg-brand/10 text-brand";
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">Manage Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manually activate plans for users who paid via bank transfer.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button onClick={fetchUsers} className="text-sm text-brand hover:underline font-medium">Refresh List</button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3">Name / Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Current Plan</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{user.role.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.schoolName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPlanColor(user.currentPlan)}`}>
                        {user.currentPlan === 'free' ? 'Free' : user.currentPlan.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.expiresAt}</td>
                    <td className="px-4 py-3 text-right">
                      {user.currentPlan === 'free' || user.status !== 'active' ? (
                        <div className="relative group inline-block text-left">
                          <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors">
                            <Crown className="h-3.5 w-3.5" /> Activate Plan
                          </button>
                          {/* Dropdown Menu */}
                          <div className="absolute right-0 z-10 mt-1 hidden w-48 flex-col rounded-lg border border-border bg-background shadow-lg group-hover:flex">
                            <button onClick={() => handleActivate(user.id, user.role === 'school_admin' ? 'school_owner' : 'pro', 'monthly')} className="px-3 py-2 text-left text-xs hover:bg-muted">1 Month (Pro/Starter)</button>
                            <button onClick={() => handleActivate(user.id, user.role === 'school_admin' ? 'school_pro' : 'premium', 'monthly')} className="px-3 py-2 text-left text-xs hover:bg-muted">1 Month (Pro/Premium)</button>
                            <button onClick={() => handleActivate(user.id, user.role === 'school_admin' ? 'school_pro' : 'pro', 'termly')} className="px-3 py-2 text-left text-xs hover:bg-muted border-t border-border">3 Months (Termly)</button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple arrow icon component to avoid extra imports if not needed
const ArrowLeftIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
