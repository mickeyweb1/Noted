import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Marketing Pages
const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));
const AboutPage = lazy(() => import("./pages/marketing/AboutPage"));
const SchoolPage = lazy(() => import("./pages/marketing/SchoolPage"));
const StudentPage = lazy(() => import("./pages/marketing/StudentPage"));
const PersonalPage = lazy(() => import("./pages/marketing/PersonalPage"));
const ContactPage = lazy(() => import("./pages/marketing/ContactPage"));
const GameShowLobby = lazy(() => import("./pages/GameShowLobby"));
const StudioHub = lazy(() => import("./pages/StudioHub"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const SuperAdminSupportInbox = lazy(() => import("./pages/schoolAdmin/SuperAdminSupportInbox"));
const GameShowBoard = lazy(() => import("./pages/GameShowBoard"));
const AdminHelp = lazy(() => import("./pages/AdminHelp"));
const StudentHelp = lazy(() => import("./pages/StudentHelp"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AiFlashcards = lazy(() => import("./pages/AiFlashcards"));
const AddTeacher = lazy(() => import("./pages/schoolAdmin/AddTeacher"));

// Auth Pages
const LoginPage = lazy(() => import("./auth/LoginPage"));
const RoleSelectionPage = lazy(() => import("./auth/RoleSelectionPage"));
const SchoolStudentRegisterPage = lazy(() => import("./auth/SchoolStudentRegisterPage"));
const SchoolAdminRegisterPage = lazy(() => import("./auth/SchoolAdminRegisterPage"));
const PersonalUserRegisterPage = lazy(() => import("./auth/PersonalUserRegisterPage"));
const AdminGameShowCreator = lazy(() => import("./pages/AdminGameShowCreator"));

import StudentDashboardLayout from "./components/layouts/StudentDashboardLayout";
const StudentHome = lazy(() => import("./pages/Dashboard/homePage"));
const Revision = lazy(() => import("./pages/Dashboard/Revision"));
const StudentAiGenerator = lazy(() => import("./pages/Dashboard/aiGenerator"));
const AiTeacher = lazy(() => import("./pages/Dashboard/AiTeacher"));
const StudentLibrary = lazy(() => import("./pages/Dashboard/libirary"));
const StudentQuiz = lazy(() => import("./pages/Dashboard/StudentQuiz"));
const FocusTime = lazy(() => import("./pages/Dashboard/focusTime"));
const StudentSchedule = lazy(() => import("./pages/Dashboard/reminder"));
const StudyReview = lazy(() => import("./pages/Dashboard/StudyReview"));
const StudentSetting = lazy(() => import("./pages/Dashboard/setting"));
const MusicGenerator = lazy(() => import("./pages/MusicGenerator"));
const StudentDirectorys = lazy(() => import("./pages/Dashboard/StudentDirectory"));
const BattleArena = lazy(() => import("./pages/Dashboard/BattleArena"));
const VideoGenerator = lazy(() => import("./pages/VideoGenerator"));
const PodcastGenerator = lazy(() => import("./pages/PodcastGenerator"));

// Admin Dashboard Pages
import AdminDashboardLayout from "./components/layouts/AdminDashboardLayout";
const AdminDashboard = lazy(() => import("./pages/schoolAdmin/AdminDashboard"));
const AddStudent = lazy(() => import("./pages/schoolAdmin/AddStudentPage"));
const StudentDirectory = lazy(() => import("./pages/schoolAdmin/StudentManagementPage"));
const AdminBillingPage = lazy(() => import("./pages/schoolAdmin/AdminBillingPage"));
const AdminQuizGenerator = lazy(() => import("./pages/AdminQuizGenerator"));
const MyTeachers = lazy(() => import("./pages/schoolAdmin/MyTeachers"));
const QuizResultsDashboard = lazy(() =>
  import("./pages/QuizResultsPage").then(({ QuizResultsDashboard }) => ({ default: QuizResultsDashboard })),
);
const QuizResultsPage = lazy(() => import("./pages/QuizResultsPage"));
const SuperAdminFeedback = lazy(() => import("./pages/schoolAdmin/SuperAdminFeedback"));

// Shared Pages
const CheckoutPage = lazy(() => import("./components/CheckoutPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Leaderboard = lazy(() => import("./pages/Dashboard/Leaderboard"));
const TakeQuiz = lazy(() => import("./pages/TakeQuiz"));

function App() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading page" className="min-h-screen" />}>
      <Routes>
      {/* ================= PUBLIC MARKETING ROUTES ================= */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/school" element={<SchoolPage />} />
      <Route path="/game-show-lobby" element={<GameShowLobby />} />
      <Route path="/student" element={<StudentPage />} />
      <Route path="/personal" element={<PersonalPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/take-quiz" element={<TakeQuiz />} />

      {/* ================= AUTH ROUTES ================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<RoleSelectionPage />} />
      <Route path="/signup/school-student" element={<SchoolStudentRegisterPage />} />
      <Route path="/signup/school-admin" element={<SchoolAdminRegisterPage />} />
      <Route path="/signup/personal" element={<PersonalUserRegisterPage />} />

      {/* ================= SHARED ROUTES ================= */}
      <Route path="/checkout" element={<CheckoutPage />} />
         <Route 
        path="/settings" 
        element={
          <ProtectedRoute allowedRoles={["student", "personal_user", "teacher", "school_admin", "super_admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
            <Route path="/pricing" element={<PricingPage />} />

      {/* ================= STUDENT DASHBOARD ROUTES ================= */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["student", "personal_user"]}>
            <StudentDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<StudentHome />} />
        <Route path="/revision" element={<Revision />} />
        <Route path="/battle-arena" element={<BattleArena />} />
        <Route path="/ai-teacher" element={<AiTeacher />} />
        <Route path="/aiGenerator" element={<StudentAiGenerator />} />
        <Route path="/ai-flashcards" element={<AiFlashcards />} />
        <Route path="/myLibrary" element={<StudentLibrary />} />
        <Route path="/quiz" element={<StudentQuiz />} />
        <Route path="/ai" element={<StudioHub />} /> 
        <Route path="/podcast" element={<PodcastGenerator />} />
        <Route path="/focusTime" element={<FocusTime />} />
<Route path="/help/student" element={<StudentHelp />} />

        <Route path="/support" element={<SupportPage />} />
        <Route path="/reminder" element={<StudentSchedule />} />
        <Route path="/study-review" element={<StudyReview />} />
        <Route path="/studentSetting" element={<StudentSetting />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/directory" element={<StudentDirectorys />} />
        <Route path="/music-studio" element={<MusicGenerator />} />
        <Route path="/video-studio" element={<VideoGenerator />} />
      </Route>

      {/* ================= ADMIN DASHBOARD ROUTES ================= */}
      <Route
        element={
          // ✅ FIX: Added "teacher" so they can access the admin layout
          <ProtectedRoute allowedRoles={["school_admin", "super_admin", "teacher"]}>
            <AdminDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentDirectory />} />
            <Route path="/admin/teachers" element={<MyTeachers />} />
        <Route path="/admin/add-student" element={<AddStudent />} />
        <Route path="/admin/billing" element={<AdminBillingPage />} />
        <Route path="/admin/quizzes" element={<AdminQuizGenerator />} />
        <Route path="/admin/quiz-results" element={<QuizResultsDashboard />} />
          <Route path="/game-show" element={<GameShowBoard />} /> 
        <Route path="/admin/game-show-creator" element={<AdminGameShowCreator />} /> {/* ✅ ADD THIS LINE */}
<Route path="/admin/quiz/:quizId/results" element={<QuizResultsPage />} />
 <Route path="/help/admin" element={<AdminHelp />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/feedback" element={<SuperAdminFeedback />} /> 
<Route path="/admin/add-teacher" element={<AddTeacher />} />
        <Route path="/admin/support-inbox" element={<SuperAdminSupportInbox />} />
        <Route path="/admin/support" element={<SupportPage />} />
      </Route>

      {/* ================= CATCH-ALL (404) ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
