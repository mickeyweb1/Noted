import SignInPage from "./auth/student/loginSinin";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./hooks/isSidebarOpen";

// --- DASHBOARD PAGES (Placeholders - Replace with your actual imports later) ---
const Dashboard = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">
      Dashboard
    </h1>
    <p className="text-muted-foreground mt-2">Welcome to your dashboard.</p>
  </div>
);
const AIGenerator = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">
      AI Generator
    </h1>
  </div>
);
const MyLibrary = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">
      My Library
    </h1>
  </div>
);
const Quiz = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">Quiz</h1>
  </div>
);
const FocusTime = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">
      Focus Time
    </h1>
  </div>
);
const StudentSetting = () => (
  <div className="p-6">
    <h1 className="text-2xl font-display font-bold text-foreground">
      Settings
    </h1>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<SignInPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="aiGenerator" element={<AIGenerator />} />
        <Route path="myLibrary" element={<MyLibrary />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="focusTime" element={<FocusTime />} />
        <Route path="studentSetting" element={<StudentSetting />} />
      </Route>

      {/* Catch-all for undefined routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
