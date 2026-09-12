import { useState } from "react";
import { 
  ArrowRight, Mail, MapPin, Phone, MessageSquare, Loader2, CheckCircle2 
} from "lucide-react";
import MarketingLayout from "./MarketingLayout";
import api from "../../utils/api";

const CONTACT_INFO = [
  { 
    icon: Mail, 
    title: "Email Us", 
    detail: "hello@notedstudy.com", 
    description: "We usually reply within 24 hours."
  },
  { 
    icon: Phone, 
    title: "Call Us", 
    detail: "+234 (0) 800 000 0000", 
    description: "Mon-Fri from 8am to 5pm WAT."
  },
  { 
    icon: MapPin, 
    title: "Our Office", 
    detail: "Lagos, Nigeria", 
    description: "Building the future of education from home."
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", role: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await api.post("/contact", formData);
      if (response.data.success) {
        setIsSuccess(true);
        setFormData({ firstName: "", lastName: "", email: "", role: "", message: "" });
        setTimeout(() => setIsSuccess(false), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Get in Touch</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Let’s build a smarter learning experience.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Whether you are a school looking to partner with us, a parent with questions, 
            or a student who needs help, we are here to listen.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* LEFT SIDE: Contact Info */}
          <div className="space-y-6">
            <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
              {CONTACT_INFO.map(({ icon: Icon, title, detail, description }) => (
                <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-muted/30 p-4 mb-4 last:mb-0 transition hover:bg-muted/50">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 font-medium text-brand">{detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[30px] border border-border bg-gradient-to-br from-brand-soft to-electric-soft p-6 text-center">
              <MessageSquare className="h-12 w-12 text-brand mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">Prefer a face-to-face chat?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                We are currently scheduling demo calls with forward-thinking schools. 
                Book a 15-minute intro call with our team.
              </p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-medium text-foreground border border-border shadow-sm hover:bg-muted transition">
                Book a Demo Call <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Contact Form */}
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            {isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Message Sent!</h3>
                <p className="text-muted-foreground max-w-sm">Thank you for reaching out. We will get back to you at {formData.email} shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <p className="text-sm text-red-500 text-center bg-red-500/10 p-3 rounded-lg">{error}</p>}
                
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">First name <span className="text-red-500">*</span></label>
                    <input name="firstName" value={formData.firstName} onChange={handleChange} required className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all" placeholder="Jane" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Last name <span className="text-red-500">*</span></label>
                    <input name="lastName" value={formData.lastName} onChange={handleChange} required className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Email address <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all" placeholder="you@example.com" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">I am a...</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all">
                    <option value="">Select your role...</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent / Guardian</option>
                    <option value="school_admin">School Administrator / Teacher</option>
                    <option value="partner">Potential Partner / Sponsor</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Message <span className="text-red-500">*</span></label>
                  <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} className="flex w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all resize-none" placeholder="Tell us how we can help your school, family, or learning journey..." />
                </div>

                <button type="submit" disabled={isSubmitting} className="mt-2 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <>Send message <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}