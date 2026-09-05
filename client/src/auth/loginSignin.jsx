import SiginFirstSection from './SiginLoginInfo/ImageSection/page'
// import YourLoginForm from './YourLoginForm' 
import YourLoginForm from './SiginLoginInfo/LoginSigin/page'

export default function SignInPage() {
  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full m-0 p-0 bg-gradient-to-br from-brand-soft via-accent to-electric-soft">
      
      {/* Section 1: The marketing/info section */}
      <SiginFirstSection />
      
      {/* Section 2: Your login form */}
      {/* <YourLoginForm /> */}
      <YourLoginForm />
      
    </main>
  )
}