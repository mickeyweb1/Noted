import { useState, useEffect } from "react";
import { 
    Calendar, Clock, Plus, Trash2, BookOpen, Brain, 
    FileText, AlertCircle, X, CheckCircle2, Bell, Sparkles
} from "lucide-react";

export default function StudentSchedule() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    
    // 1. STATE: Starts empty. No mock data.
    const [events, setEvents] = useState([]); 
    const [activeAlert, setActiveAlert] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        type: 'exam',
        date: '',
        time: '',
        reminderOffset: 60 // Default: 60 minutes before
    });

    // 2. LOGIC: Handle Form Inputs
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 3. LOGIC: Add Event to List
    const handleAddEvent = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.date || !formData.time) return;

        const newEvent = {
            id: Date.now(),
            ...formData,
            reminderOffset: Number(formData.reminderOffset),
            reminderTriggered: false // Prevents spamming the alert
        };

        setEvents([...events, newEvent]);
        // Reset form
        setFormData({ title: '', subject: '', type: 'exam', date: '', time: '', reminderOffset: 60 });
        setShowAddModal(false);
    };

    // 4. LOGIC: Delete Event
    const handleDeleteEvent = (id) => {
        setEvents(events.filter(e => e.id !== id));
    };

    // 5. LOGIC: Real-Time Checker (Triggers Alerts)
    useEffect(() => {
        // Check every 10 seconds
        const interval = setInterval(() => {
            const now = new Date();
            
            setEvents(prevEvents => 
                prevEvents.map(event => {
                    if (event.reminderTriggered) return event;

                    const eventDateTime = new Date(`${event.date}T${event.time}`);
                    // Calculate when the reminder should ring
                    const reminderTime = new Date(eventDateTime.getTime() - (event.reminderOffset * 60000));

                    // If it's time to ring, and the event hasn't passed yet
                    if (now >= reminderTime && now < eventDateTime) {
                        setActiveAlert({
                            title: event.title,
                            subject: event.subject,
                            type: event.type
                        });
                        // Auto-dismiss alert after 15 seconds
                        setTimeout(() => setActiveAlert(null), 15000);
                        
                        return { ...event, reminderTriggered: true };
                    }
                    return event;
                })
            );
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // 6. HELPER: Calculate exact time remaining for UI
    const getTimeRemaining = (date, time) => {
        const now = new Date();
        const eventDate = new Date(`${date}T${time}`);
        const diff = eventDate - now;

        if (diff < 0) return { text: 'Passed', isPassed: true, isUrgent: false };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let text = '';
        if (days > 0) text = `${days}d ${hours}h`;
        else if (hours > 0) text = `${hours}h ${minutes}m`;
        else text = `${minutes}m`;

        // Urgent if less than 24 hours
        const isUrgent = diff < (1000 * 60 * 60 * 24); 

        return { text, isPassed: false, isUrgent };
    };

    // 7. HELPER: Find the most urgent event for the right-side widget
    const futureEvents = events
        .filter(e => new Date(`${e.date}T${e.time}`) > new Date())
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    const mostUrgentEvent = futureEvents.length > 0 ? futureEvents[0] : null;

    const filters = [
        { id: 'all', label: 'All Events', icon: Calendar },
        { id: 'exam', label: 'Exams', icon: FileText },
        { id: 'quiz', label: 'Quizzes', icon: Brain },
        { id: 'assignment', label: 'Assignments', icon: BookOpen },
    ];

    const getIcon = (type) => {
        if (type === 'exam') return FileText;
        if (type === 'quiz') return Brain;
        return BookOpen;
    };

    return (
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            
            {/* ALERT BANNER (Slides down when an event is near) */}
            {activeAlert && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-xl bg-flame text-flame-foreground shadow-2xl border border-flame/20 flex items-center gap-3 animate-in slide-in-from-top fade-in duration-500">
                    <div className="p-2 bg-flame-foreground/20 rounded-full">
                        <Bell className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">Reminder: {activeAlert.title}</p>
                        <p className="text-xs opacity-90">Starting soon for {activeAlert.subject}!</p>
                    </div>
                    <button onClick={() => setActiveAlert(null)} className="p-1 hover:bg-flame-foreground/20 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-brand" /> Schedule & Reminders
                        </h1>
                        <p className="text-muted-foreground mt-1">Track your exams and get alerted before they start.</p>
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-brand text-brand-foreground font-medium text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add New Event
                    </button>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT: EVENTS LIST */}
                    <div className="lg:col-span-2 space-y-5">
                        
                        {/* Filters */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {filters.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                        activeFilter === filter.id
                                            ? 'bg-card border border-border shadow-sm text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                                    }`}
                                >
                                    <filter.icon className="w-4 h-4" />
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        {/* Events List OR Empty State */}
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-border">
                                <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                                    <Calendar className="w-10 h-10 text-brand" />
                                </div>
                                <h3 className="text-xl font-display font-bold text-foreground">No events yet</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm">Your schedule is clear! Add your first exam, quiz, or assignment to get started.</p>
                                <button 
                                    onClick={() => setShowAddModal(true)}
                                    className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Add Your First Event
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {events
                                    .filter(e => activeFilter === 'all' || e.type === activeFilter)
                                    .map((event) => {
                                        const Icon = getIcon(event.type);
                                        const { text, isPassed, isUrgent } = getTimeRemaining(event.date, event.time);
                                        const color = event.color || (event.type === 'exam' ? 'brand' : event.type === 'quiz' ? 'electric' : 'flame');
                                        
                                        return (
                                            <div key={event.id} className={`group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all ${isPassed ? 'opacity-50' : ''}`}>
                                                
                                                {/* Left: Icon & Dynamic Countdown */}
                                                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl shrink-0 ${
                                                    isPassed ? 'bg-muted text-muted-foreground' : 
                                                    isUrgent ? 'bg-flame/10 text-flame' : 
                                                    `bg-${color}/10 text-${color}`
                                                }`}>
                                                    <Icon className="w-5 h-5 mb-0.5" />
                                                    <span className="text-[10px] font-bold uppercase">{isPassed ? 'Done' : text}</span>
                                                </div>

                                                {/* Middle: Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isPassed ? 'text-muted-foreground' : `text-${color}`}`}>{event.subject}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">• {event.type}</span>
                                                    </div>
                                                    <h3 className={`text-base font-semibold truncate ${isPassed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{event.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {event.date}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</span>
                                                    </div>
                                                </div>

                                                {/* Right: Delete */}
                                                <button 
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: WIDGETS */}
                    <div className="space-y-6">
                        
                        {/* Dynamic Urgent Reminder Widget */}
                        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-flame" /> Next Up
                            </h3>
                            
                            {mostUrgentEvent ? (
                                <>
                                    <div className="p-4 rounded-xl bg-flame/5 border border-flame/20">
                                        <h4 className="text-lg font-bold text-foreground">{mostUrgentEvent.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{mostUrgentEvent.subject} • {mostUrgentEvent.type}</p>
                                        <div className="flex items-center gap-2 mt-3 text-xs font-medium text-flame">
                                            <Clock className="w-3.5 h-3.5" />
                                            Starts in {getTimeRemaining(mostUrgentEvent.date, mostUrgentEvent.time).text}
                                        </div>
                                    </div>
                                    <button className="w-full py-2 rounded-lg bg-flame text-flame-foreground text-xs font-semibold hover:bg-flame/90 transition-colors">
                                        Study Now
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <Sparkles className="w-8 h-8 text-brand mx-auto mb-2" />
                                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                                    <p className="text-xs text-muted-foreground mt-1">No upcoming events.</p>
                                </div>
                            )}
                        </div>

                        {/* Weekly Focus Chart (Kept from previous design) */}
                        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="font-display font-semibold text-foreground">This Week's Focus</h3>
                            <div className="flex items-end justify-between h-24 px-2">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                    const heights = [40, 80, 60, 100, 30, 10, 0]; 
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                            <div className={`w-full max-w-[12px] rounded-full transition-all ${i === 3 ? 'bg-brand' : 'bg-muted'}`} style={{ height: `${heights[i]}%` }} />
                                            <span className="text-[10px] text-muted-foreground font-medium">{day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-3 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Total Study Time</span>
                                <span className="text-sm font-bold text-foreground">14h 20m</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD EVENT MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <form onSubmit={handleAddEvent} className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-display font-bold text-foreground">Add New Event</h2>
                            <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Event Title</label>
                                <input name="title" value={formData.title} onChange={handleInputChange} type="text" placeholder="e.g., Biology Midterm" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Date</label>
                                    <input name="date" value={formData.date} onChange={handleInputChange} type="date" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Time</label>
                                    <input name="time" value={formData.time} onChange={handleInputChange} type="time" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Subject</label>
                                    <input name="subject" value={formData.subject} onChange={handleInputChange} type="text" placeholder="e.g., Biology" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Type</label>
                                    <select name="type" value={formData.type} onChange={handleInputChange} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                        <option value="exam">Exam</option>
                                        <option value="quiz">Quiz</option>
                                        <option value="assignment">Assignment</option>
                                    </select>
                                </div>
                            </div>

                            {/* NEW: Reminder Time Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-brand" /> Remind me...
                                </label>
                                <select name="reminderOffset" value={formData.reminderOffset} onChange={handleInputChange} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                    <option value={15}>15 minutes before</option>
                                    <option value={30}>30 minutes before</option>
                                    <option value={60}>1 hour before</option>
                                    <option value={1440}>1 day before</option>
                                    <option value={10080}>1 week before</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 h-10 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:bg-brand/90 transition-colors flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Save Event
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}