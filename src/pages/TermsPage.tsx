import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ModuleHeader from "../components/ModuleHeader";

const TermsPage = () => {
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
      title: "1. Use of Service",
      items: [
        "Use NodLync only for lawful purposes",
        "Not misuse, exploit, or break the system",
        "Not attempt unauthorized access"
      ]
    },
    {
      title: "2. User Accounts",
      content: "You are responsible for your account and credentials. Don’t share your login. You’re accountable for all activity under your account."
    },
    {
      title: "3. Platform Availability",
      items: [
        "We don’t guarantee 100% availability",
        "Features may change, improve, or break temporarily"
      ]
    },
    {
      title: "4. Intellectual Property",
      content: "NodLync (design, code, branding) is our property. You retain ownership of your own data and content."
    },
    {
      title: "5. Termination",
      content: "We can suspend or terminate accounts if you violate these terms or abuse the platform. You can also delete your account anytime."
    },
    {
      title: "6. Limitation of Liability",
      items: [
        "Not liable for data loss",
        "Not liable for downtime",
        "Not liable for indirect damages"
      ],
      note: "Use NodLync at your own risk."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-fg selection:bg-rose-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={handleBack}
            className="group flex items-center gap-2 text-sm font-bold text-fg-muted hover:text-rose-400 transition-colors"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Workspace</span>
          </button>
          
          <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-mono text-rose-400 uppercase tracking-widest">
            Terms & Conditions v1.0
          </div>
        </div>

        <ModuleHeader 
          title="Terms & Conditions"
          description="PLEASE READ THESE TERMS CAREFULLY BEFORE USING OUR SERVICE"
          icon="📜"
        />

        <div className="mt-12 space-y-10">
          <div className="glass-panel p-8 bg-surface/30 border-stroke/50 backdrop-blur-xl">
             <p className="text-lg text-fg-secondary leading-relaxed mb-6">
               By using <span className="text-rose-400 font-bold">NodLync</span>, you agree to these terms. If you don’t agree, don’t use the platform.
             </p>
             <div className="h-px bg-gradient-to-r from-transparent via-stroke to-transparent mb-10" />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {sections.map((section, idx) => (
                 <div key={idx} className="space-y-3">
                   <h3 className="text-sm font-black uppercase tracking-widest text-rose-400">{section.title}</h3>
                   {section.content && <p className="text-sm text-fg-muted leading-relaxed">{section.content}</p>}
                   {section.items && (
                     <ul className="space-y-2">
                       {section.items.map((item, i) => (
                         <li key={i} className="flex gap-2 text-sm text-fg-muted">
                           <span className="text-rose-400">•</span>
                           <span>{item}</span>
                         </li>
                       ))}
                     </ul>
                   )}
                   {section.note && (
                     <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-bold text-rose-400 text-center uppercase tracking-widest">
                       {section.note}
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>

          <div className="glass-panel p-6 bg-rose-500/5 border-rose-500/20 rounded-3xl text-center">
            <h4 className="text-lg font-bold text-fg">Acceptance</h4>
            <p className="text-sm text-fg-muted mb-4">By accessing or using our service, you agree to these terms.</p>
            <button 
              onClick={handleBack}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg shadow-rose-900/20"
            >
              I Accept & Continue
            </button>
          </div>

          <div className="text-center text-[10px] text-fg-muted uppercase tracking-[0.2em] font-medium pt-8">
            © 2026 NODLYNC OPS • USE RESPONSIBLY
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
