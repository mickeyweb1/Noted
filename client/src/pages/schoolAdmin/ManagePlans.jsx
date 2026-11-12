import { useState, useEffect } from "react";
import { Search, CheckCircle, Loader2, Crown, X, Plus } from "lucide-react"; // ✅ Added Plus
import { Link } from "react-router-dom";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function ManagePlans() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [isActivating, setIsActivating] = useState(false);

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

  const openActivationModal = (user) => {
    const defaultPlan = user.role === "school_admin" ? "school_owner" : "pro";
    setSelectedPlan(defaultPlan);
    setBillingCycle("monthly");
    setSelectedUser(user);
  };

  const confirmActivation = async () => {
    if (!selectedUser) return;
    setIsActivating(true);
    try {
      const res = await api.post("/admin/super/activate-plan", { 
        userId: selectedUser.id, 
        newPlan: selectedPlan, 
        billingCycle 
      });
      if (res.data.success) {
        alert(res.data.message);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to activate plan.");
    } finally {
      setIsActivating(false);
    }
  };

  // ✅ NEW: Handle adding a teacher slot
  const handleAddSlot = async (userId, userName) => {
    if (!window.confirm(`Add 1 extra teacher slot for ${userName}'s school?`)) return;
    try {
      const res = await api.post("/admin/super/add-teacher-slot", { userId });
      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add slot.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanColor = (plan) => {
    if (!plan || plan === 'free') return "bg-gray-100 text-gray-700";
    if (plan.includes('school')) return "bg-purple-100 text-purple-700";
    return "bg-brand/10 text-brand";
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">Manage Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manually activate plans or add slots for users who paid via bank transfer.</p>
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
                      {/* ✅ NEW: Conditional Action Buttons */}
                      {user.currentPlan === 'free' || user.isExpired ? (
                        <button 
                          onClick={() => openActivationModal(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors"
                        >
                          <Crown className="h-3.5 w-3.5" /> Activate
                        </button>
                      ) : user.role === 'school_admin' ? (
                        <button 
                          onClick={() => handleAddSlot(user.id, user.fullName)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add 1 Slot
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
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

      {/* ✅ ACTIVATION MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Activate Plan</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Assigning plan to <span className="font-semibold text-foreground">{selectedUser.fullName}</span> ({selectedUser.role})
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Select Plan</label>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="pro">Teacher Pro</option>
                  <option value="premium">Teacher Premium</option>
                  <option value="school_owner">School Starter</option>
                  <option value="school_pro">School Pro</option>
                  <option value="school_premium">School Premium</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      billingCycle === 'monthly' 
                        ? 'bg-brand text-brand-foreground border-brand' 
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    1 Month
                  </button>
                  <button 
                    onClick={() => setBillingCycle('termly')}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      billingCycle === 'termly' 
                        ? 'bg-brand text-brand-foreground border-brand' 
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    3 Months (Termly)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setSelectedUser(null)} 
                className="flex-1 py-2.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmActivation} 
                disabled={isActivating} 
                className="flex-1 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isActivating ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}