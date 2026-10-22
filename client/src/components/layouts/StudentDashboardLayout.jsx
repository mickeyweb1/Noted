import { useState } from "react";
import { Outlet } from "react-router-dom";
import StudentSideBar from "../personalUser/sidebar";
import StudentTopBar from "../personalUser/topBar";
import { MusicProvider } from "../../context/MusicContext";

export default function StudentDashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <MusicProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F5F7] dark:bg-background">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close student menu"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Real Sidebar */}
        <StudentSideBar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <StudentTopBar onToggleSidebar={toggleSidebar} />

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </MusicProvider>
  );
}
