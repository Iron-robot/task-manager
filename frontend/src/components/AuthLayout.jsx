/** Shared frame for the login and sign-up screens. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth">
      <section className="auth-panel">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Tasks
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </section>
    </main>
  );
}
