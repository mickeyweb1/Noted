import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((isOpen) => !isOpen);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
          aria-label="Close admin menu"
        />
      )}

      <AdminSideBar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
