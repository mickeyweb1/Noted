import { Navigate, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Marketing Pages
import LandingPage from "./pages/marketing/LandingPage";
import AboutPage from "./pages/marketing/AboutPage";
import SchoolPage from "./pages/marketing/SchoolPage";
import StudentPage from "./pages/marketing/StudentPage";
import PersonalPage from "./pages/marketing/PersonalPage";
import ContactPage from "./pages/marketing/ContactPage";

// Auth Pages
import LoginPage from "./auth/LoginPage";
import RoleSelectionPage from "./auth/RoleSelectionPage";
import SchoolStudentRegisterPage from "./auth/SchoolStudentRegisterPage";
import SchoolAdminRegisterPage from "./auth/SchoolAdminRegisterPage";
import PersonalUserRegisterPage from "./auth/PersonalUserRegisterPage";

// Student Dashboard Pages
import StudentDashboardLayout from "./hooks/isSidebarOpen"; // Ensure this component renders <Outlet />
import StudentHome from "./pages/Dashboard/homePage";
import StudentAiGenerator from "./pages/Dashboard/aiGenerator";
import AiTeacher from "./pages/Dashboard/AiTeacher";
import StudentLibrary from "./pages/Dashboard/libirary";
import StudentQuiz from "./pages/Dashboard/StudentQuiz";
import FocusTime from "./pages/Dashboard/focusTime";
import StudentSchedule from "./pages/Dashboard/reminder";
import StudentSetting from "./pages/Dashboard/setting";
import MusicGenerator from "./pages/MusicGenerator";
import StudentDirectorys from "./pages/Dashboard/StudentDirectory";
import StudentProfile from "./pages/Dashboard/StudentProfile";
import BattleArena from "./pages/Dashboard/BattleArena";
import VideoGenerator from "./pages/VideoGenerator";
// Admin Dashboard Pages
import AdminDashboardLayout from "./components/layouts/AdminDashboardLayout";
import AdminDashboard from "./pages/schoolAdmin/AdminDashboard";
import AddStudent from "./pages/schoolAdmin/AddStudentPage";
import StudentDirectory from "./pages/schoolAdmin/StudentManagementPage";
import AdminBillingPage from "./pages/schoolAdmin/AdminBillingPage";

// Shared Pages
import CheckoutPage from "./components/CheckoutPage";
import SettingsPage from "./pages/SettingsPage";
import Leaderboard from "./pages/Dashboard/Leaderboard";

function App() {
  return (
    <Routes>
      {/* ================= PUBLIC MARKETING ROUTES ================= */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/school" element={<SchoolPage />} />
      <Route path="/student" element={<StudentPage />} />
      <Route path="/personal" element={<PersonalPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* ================= AUTH ROUTES ================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<RoleSelectionPage />} />
      <Route
        path="/signup/school-student"
        element={<SchoolStudentRegisterPage />}
      />
      <Route
        path="/signup/school-admin"
        element={<SchoolAdminRegisterPage />}
      />
      <Route path="/signup/personal" element={<PersonalUserRegisterPage />} />

      {/* ================= SHARED ROUTES ================= */}
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* ================= STUDENT DASHBOARD ROUTES ================= */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["student", "personal_user"]}>
            <StudentDashboardLayout />{" "}
            {/* Ensure this file exists and has <Outlet /> */}
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<StudentHome />} />
        <Route path="/battle-arena" element={<BattleArena />} />
        <Route path="/ai-teacher" element={<AiTeacher />} />
        <Route path="/aiGenerator" element={<StudentAiGenerator />} />
        <Route path="/myLibrary" element={<StudentLibrary />} />
        <Route path="/quiz" element={<StudentQuiz />} />
        <Route path="/focusTime" element={<FocusTime />} />
        <Route path="/reminder" element={<StudentSchedule />} />
        <Route path="/studentSetting" element={<StudentSetting />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/directory" element={<StudentDirectorys />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/music-studio" element={<MusicGenerator />} />
        <Route path="/video-studio" element={<VideoGenerator />} />
      </Route>

      {/* ================= ADMIN DASHBOARD ROUTES ================= */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["school_admin"]}>
            <AdminDashboardLayout />{" "}
            {/* Professional responsive admin layout */}
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentDirectory />} />
        <Route path="/admin/add-student" element={<AddStudent />} />
        <Route path="/admin/billing" element={<AdminBillingPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Route>

      {/* ================= CATCH-ALL (404) ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
