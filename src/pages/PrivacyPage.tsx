import { Link } from "react-router-dom";

const PrivacyPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
    <div className="glass-panel max-w-3xl w-full px-8 py-8 shadow-xl">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-fg-secondary mb-3">Your privacy is important to us. This page outlines how we collect and use data.</p>
      <p className="text-fg-secondary mb-3">Welcome to NodLync. Your privacy matters, and we’re committed to protecting your data without doing shady stuff behind the scenes.

1. Information We Collect

We may collect the following types of data:

Account Information: Name, email, login credentials
Usage Data: Actions, interactions, workflows, logs
Device & Technical Data: IP address, browser type, OS
Optional Data: Anything you voluntarily provide inside the platform
2. How We Use Your Information

We use your data to:

Provide and improve the NodLync platform
Manage user accounts and authentication
Enable collaboration features (teams, workflows, etc.)
Monitor performance, security, and abuse
Communicate updates or important notices

We don’t sell your data. Period.

3. Data Storage & Security
Your data is stored securely using trusted cloud infrastructure
We implement encryption, access control, and monitoring
No system is 100% secure, but we actively reduce risk
4. Third-Party Services

We may use services like:

Authentication providers
Cloud databases (e.g., Supabase)
Analytics tools

These services have their own privacy policies.

5. Cookies & Tracking

We may use cookies or similar technologies to:

Keep you logged in
Improve user experience
Analyze usage patterns

You can disable cookies in your browser, but some features may break.

6. Data Retention

We keep your data only as long as necessary:

While your account is active
Or as required for legal/security reasons
7. Your Rights

You can:

Request access to your data
Request deletion of your account
Update or correct your information
8. Changes to This Policy

We may update this policy. If we do, we’ll notify you or update the date above.

9. Contact

For any privacy concerns:
Email: maddad@nodlync.com

NodLync respects your data. We don’t play games with it.</p>
      <p className="text-fg-secondary">For more information, contact support.</p>
      <div className="mt-6">
        <Link className="text-primary hover:underline" to="/login">Back to Login</Link>
      </div>
    </div>
  </div>
);

export default PrivacyPage;
