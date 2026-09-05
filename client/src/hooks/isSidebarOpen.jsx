import { useState } from "react";
import { Outlet } from "react-router-dom"; // Renders your actual page content
import StudentSideBar from "../components/personalUser/sidebar";
import StudentTopBar from "../components/personalUser/topBar";

export default function StudentDashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[#F4F5F7] dark:bg-background overflow-hidden">
      
      {/* Mobile Sidebar Overlay (Darkens background when open) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <StudentSideBar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <StudentTopBar onToggleSidebar={toggleSidebar} />

        {/* Page Content (This is where <StudentHome>, <AiTeacher>, etc. will render) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
