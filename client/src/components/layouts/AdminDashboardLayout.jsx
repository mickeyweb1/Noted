import { Outlet } from "react-router-dom";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";
import AdminBottomNav from "./AdminBottomNav";

export default function AdminDashboardLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar: hidden on mobile, visible from the md breakpoint. */}
      <AdminSideBar />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />

        <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {/* Extra bottom padding keeps content clear of the fixed mobile nav. */}
          <div className="p-4 pb-28 md:p-6 md:pb-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <AdminBottomNav />
    </div>
  );
}
