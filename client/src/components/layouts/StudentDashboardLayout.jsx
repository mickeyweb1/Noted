import { useState } from "react";
import { Outlet } from "react-router-dom";
// ✅ Updated paths assuming this file is now in src/components/layouts/
import StudentSideBar from "../personalUser/sidebar"; 
import StudentTopBar from "../personalUser/topBar";   
import { MusicProvider } from "../../context/MusicContext"; 

export default function StudentDashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <MusicProvider>
      <div className="flex h-screen bg-[#F4F5F7] dark:bg-background overflow-hidden">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={closeSidebar}
          />
        )}

        <StudentSideBar isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <StudentTopBar onToggleSidebar={toggleSidebar} />
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </MusicProvider>
  );
}