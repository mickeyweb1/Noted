// src/pages/auth/AuthLayout.jsx
import SiginFirstSection from './signInInfo/imageSection/page';

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* Left Side: Always visible marketing/info section */}
      <SiginFirstSection />
      
      {/* Right Side: Changes based on the current route */}
      <div className="flex min-h-screen w-full flex-col bg-background md:w-3/5">
        {children}
      </div>
    </main>
  );
}