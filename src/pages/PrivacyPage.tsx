import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ModuleHeader from "../components/ModuleHeader";

const PrivacyPage = () => {
  const navigate = useNavigate();

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    // If we have history, go back. Otherwise default to login or home.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/login");
    }
  };

  const sections = [
    {
      title: "1. Information We Collect",
      items: [
        "Account Information: Name, email, login credentials",
        "Usage Data: Actions, interactions, workflows, logs",
        "Device & Technical Data: IP address, browser type, OS",
        "Optional Data: Anything you voluntarily provide"
      ]
    },
    {
      title: "2. How We Use Your Information",
      items: [
        "Provide and improve the NodLync platform",
        "Manage user accounts and authentication",
        "Enable collaboration features (teams, workflows, etc.)",
        "Monitor performance, security, and abuse",
        "Communicate updates or important notices"
      ],
      note: "We don’t sell your data. Period."
    },
    {
      title: "3. Data Storage & Security",
      content: "Your data is stored securely using trusted cloud infrastructure. We implement encryption, access control, and monitoring to actively reduce risk."
    },
    {
      title: "4. Third-Party Services",
      content: "We may use services like Supabase for authentication and database management. These services have their own privacy policies."
    },
    {
      title: "5. Cookies & Tracking",
      content: "We use session cookies to keep you logged in and improve your experience. You can disable them in your browser, but some features may break."
    },
    {
      title: "6. Your Rights",
      items: [
        "Request access to your data",
        "Request deletion of your account",
        "Update or correct your information"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-fg selection:bg-primary/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={handleBack}
            className="group flex items-center gap-2 text-sm font-bold text-fg-muted hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Workspace</span>
          </button>
          
          <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-mono text-primary uppercase tracking-widest">
            Privacy Policy v1.0
          </div>
        </div>

        <ModuleHeader 
          title="Privacy Policy"
          description="HOW NODLYNC PROTECTS YOUR DATA AND RESPECTS YOUR DIGITAL FOOTPRINT"
          icon="🛡️"
        />

        <div className="mt-12 space-y-10">
          <div className="glass-panel p-8 bg-surface/30 border-stroke/50 backdrop-blur-xl">
             <p className="text-lg text-fg-secondary leading-relaxed mb-6">
               Welcome to <span className="text-primary font-bold">NodLync</span>. Your privacy matters, and we’re committed to protecting your data without doing shady stuff behind the scenes.
             </p>
             <div className="h-px bg-gradient-to-r from-transparent via-stroke to-transparent mb-10" />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {sections.map((section, idx) => (
                 <div key={idx} className="space-y-3">
                   <h3 className="text-sm font-black uppercase tracking-widest text-primary">{section.title}</h3>
                   {section.content && <p className="text-sm text-fg-muted leading-relaxed">{section.content}</p>}
                   {section.items && (
                     <ul className="space-y-2">
                       {section.items.map((item, i) => (
                         <li key={i} className="flex gap-2 text-sm text-fg-muted">
                           <span className="text-primary">•</span>
                           <span>{item}</span>
                         </li>
                       ))}
                     </ul>
                   )}
                   {section.note && (
                     <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 text-center uppercase tracking-widest">
                       {section.note}
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>

          <div className="glass-panel p-6 bg-primary/5 border-primary/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-bold text-fg">Have questions?</h4>
              <p className="text-sm text-fg-muted">For any privacy concerns, reach out to our legal team.</p>
            </div>
            <a href="mailto:shubhamjakhmola.info@gmail.com" className="btn-primary px-8 py-3 font-bold rounded-2xl whitespace-nowrap">
              Contact Support
            </a>
          </div>

          <div className="text-center text-[10px] text-fg-muted uppercase tracking-[0.2em] font-medium pt-8">
            © 2026 NODLYNC OPS • CRAFTED WITH DATA INTEGRITY
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
