import SignInPage from "./auth/student/loginSinin";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./hooks/isSidebarOpen";
import StudentHome from "./Pages/students/Dashboard/homePage";
import FocusTime from "./Pages/students/Dashboard/focusTime";
import StudentSetting from "./Pages/students/Dashboard/setting";
import StudentAiGenerator from "./Pages/students/Dashboard/aiGenerator";
import StudentQuiz from "./Pages/students/Dashboard/StudentQuiz"
import StudentLibrary from "./Pages/students/Dashboard/libirary";
import StudentSchedule from "./Pages/students/Dashboard/reminder";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<SignInPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="dashboard" element={<StudentHome />} />
        <Route path="aiGenerator" element={<StudentAiGenerator/>} />
        <Route path="myLibrary" element={<StudentLibrary />} />
        <Route path="quiz" element={<StudentQuiz />} />
        <Route path="focusTime" element={<FocusTime />} />
        <Route path="studentSetting" element={<StudentSetting />} />
        <Route path="/reminder" element={<StudentSchedule />} />
      </Route>

      {/* Catch-all for undefined routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
