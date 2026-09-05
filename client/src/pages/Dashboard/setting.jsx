import { useState } from "react";
import { Award, Clock, User2, Save, Phone, Mail, Camera, LogOut } from "lucide-react";
import { useUserContext } from "../../context/userContext";
import { ThemeToggle } from "../../components/themeToggle";

export default function StudentSetting() {
    const { user, updateUser, logout } = useUserContext();

    // ✅ SAFELY read directly from the user object, with fallbacks
    const [firstName, setFirstName] = useState(user?.firstName || user?.fullName?.split(' ')[0] || "");
    const [lastName, setLastName] = useState(user?.lastName || user?.fullName?.split(' ')[1] || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || ""); 

    // 2. TIMER SETTINGS STATE
    const [focusTime, setFocusTime] = useState(25);
    const [shortBreak, setShortBreak] = useState(5);
    const [longBreak, setLongBreak] = useState(15);

    // 3. NOTIFICATION STATE
    const [emailNotifications, setEmailNotifications] = useState(true);
    // Handlers
    const handleSaveProfile = () => {
        const newFullName = `${firstName} ${lastName}`.trim();

        // ✅ Update the actual logged-in user profile globally
        updateUser({
            firstName: firstName,
            lastName: lastName,
            fullName: newFullName,
            email: email,
            phone: phone
        });
        
        alert("Profile saved successfully!");
    };

    const handleSaveTimer = () => {
        // TODO: Later, save these to context/localStorage/database so the Focus page can read them
        alert("Timer settings saved!");
    };

    return (
        // Deep background for light mode, standard for dark mode
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* Header */}
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your profile, appearance, and study defaults.</p>
                </div>

                {/* ==========================================
                    1. PROFILE SECTION
                    ========================================== */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
                            <User2 className="w-5 h-5 text-brand" /> Profile Information
                        </h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center text-brand overflow-hidden border-2 border-border">
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold">{firstName[0] || 'U'}</span>
                                )}
                                <button className="absolute bottom-0 right-0 p-1.5 bg-background border border-border rounded-full text-foreground hover:bg-accent transition-colors">
                                    <Camera className="w-3 h-3" />
                                </button>
                            </div>
                            <span className="text-xs text-muted-foreground">Change Avatar</span>
                        </div>

                        {/* Editable Inputs */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">First Name</label>
                                <input 
                                    type="text" 
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Last Name</label>
                                <input 
                                    type="text" 
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Email</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Number</label>
                                <input 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 234 567 890"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveProfile}
                            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:bg-brand/90 transition-colors"
                        >
                            <Save className="w-4 h-4" /> Save Profile
                        </button>
                    </div>
                </div>

                {/* ==========================================
                    2. TIMER PREFERENCES SECTION
                    ========================================== */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
                    <div className="border-b border-border pb-4">
                        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
                            <Clock className="w-5 h-5 text-electric" /> Focus Timer Defaults
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Set your default durations for focus sessions and breaks.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Focus Duration (mins)</label>
                            <input 
                                type="number" 
                                value={focusTime}
                                onChange={(e) => setFocusTime(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Short Break (mins)</label>
                            <input 
                                type="number" 
                                value={shortBreak}
                                onChange={(e) => setShortBreak(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center font-bold text-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Long Break (mins)</label>
                            <input 
                                type="number" 
                                value={longBreak}
                                onChange={(e) => setLongBreak(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center font-bold text-flame focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveTimer}
                            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-electric text-electric-foreground font-medium text-sm hover:bg-electric/90 transition-colors"
                        >
                            <Save className="w-4 h-4" /> Save Timer Settings
                        </button>
                    </div>
                </div>

                {/* ==========================================
                    3. PREFERENCES & APPEARANCE
                    ========================================== */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
                    <div className="border-b border-border pb-4">
                        <h2 className="text-xl font-display font-semibold text-foreground">Preferences</h2>
                        <p className="text-sm text-muted-foreground mt-1">Tune how Noted looks and nudges you.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Dark Mode */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Dark Mode</h3>
                                <p className="text-xs text-muted-foreground">Easier on the eyes for late-night sessions</p>
                            </div>
                            <ThemeToggle />
                        </div>

                        {/* Email Notifications (Custom Toggle) */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
                                <p className="text-xs text-muted-foreground">Weekly recaps and streak reminders</p>
                            </div>
                            <button 
                                onClick={() => setEmailNotifications(!emailNotifications)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    emailNotifications ? 'bg-brand' : 'bg-muted'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ==========================================
                    4. DANGER ZONE / LOGOUT
                    ========================================== */}
                <div className="p-6 rounded-2xl bg-card border border-destructive/20 shadow-sm space-y-4">
                    <h2 className="text-xl font-display font-semibold text-destructive flex items-center gap-2">
                        <LogOut className="w-5 h-5" /> Account Actions
                    </h2>
                    <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
                    <button 
                        onClick={logout}
                        className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>

            </div>
        </div>
    );
}