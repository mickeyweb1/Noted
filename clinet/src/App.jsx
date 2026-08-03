import SignInPage from "./auth/student/loginSinin";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./hooks/isSidebarOpen";
import StudentHome from "./Pages/students/Dashboard/homePage";
import FocusTime from "./Pages/students/Dashboard/focusTime";

// --- DASHBOARD PAGES (Placeholders - Replace with your actual imports later) ---
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
        <Route path="dashboard" element={<StudentHome />} />
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
