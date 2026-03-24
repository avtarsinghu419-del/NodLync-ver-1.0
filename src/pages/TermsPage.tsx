import { Link } from "react-router-dom";

const TermsPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
    <div className="glass-panel max-w-3xl w-full px-8 py-8 shadow-xl">
      <h1 className="text-3xl font-bold mb-4">Terms & Conditions</h1>
      <p className="text-fg-secondary mb-3">Please read these terms and conditions carefully before using our service.</p>
      <p className="text-fg-secondary mb-3">By using NodLync, you agree to these terms. If you don’t agree, don’t use the platform.

1. Use of Service

You agree to:

Use NodLync only for lawful purposes
Not misuse, exploit, or break the system
Not attempt unauthorized access
2. User Accounts
You are responsible for your account and credentials
Don’t share your login
You’re accountable for all activity under your account
3. Platform Availability

We aim for uptime, but:

We don’t guarantee 100% availability
Features may change, improve, or break temporarily
4. Intellectual Property
NodLync (design, code, branding) is our property
You retain ownership of your own data/content
5. User Content

You are responsible for what you create or upload:

No illegal, abusive, or harmful content
We can remove content that violates terms
6. Termination

We can suspend or terminate accounts if:

You violate these terms
You abuse the platform

You can also delete your account anytime.

7. Limitation of Liability

We are not liable for:

Data loss
Downtime
Indirect damages

Use NodLync at your own risk.

8. Changes to Terms

We may update these terms anytime. Continued use = acceptance.

9. Governing Law

These terms are governed by applicable laws in your jurisdiction.

10. Contact

For any legal or support questions:
Email: maddad@nodlync.com

Use NodLync responsibly. Don’t try to outsmart the system ,it won’t end well.</p>
      <p className="text-fg-secondary">By accessing or using our service, you agree to these terms.</p>
      <div className="mt-6">
        <Link className="text-primary hover:underline" to="/login">Back to Login</Link>
      </div>
    </div>
  </div>
);

export default TermsPage;
