// src/pages/auth/AuthLayout.jsx
import SiginFirstSection from './signInInfo/imageSection/page';

export default function AuthLayout({ children }) {
  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full bg-gradient-to-br from-brand-soft via-accent to-electric-soft">
      {/* Left Side: Always visible marketing/info section */}
      <SiginFirstSection />
      
      {/* Right Side: Changes based on the current route */}
      <div className="w-full md:w-1/2 flex flex-col min-h-screen bg-background/95 backdrop-blur-sm">
        {children}
      </div>
    </main>
  );
}