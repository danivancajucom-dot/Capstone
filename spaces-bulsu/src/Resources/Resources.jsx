import LoginNav from '../Components/LoginNav/LoginNav';
import './resources.css';

export default function Resources() {
  return (
    <>
      <LoginNav activePage="resources" />
      <div className="page-shell">
      <header className="page-header">
        <h1>Resources</h1>
        <p>Access documents, guides, and useful links for your workflow.</p>
      </header>

      <section className="resource-list">
        <article className="resource-card">
          <h2>Header Layout Guide</h2>
          <p>Use a consistent page header for every screen and keep spacing clean.</p>
        </article>
        <article className="resource-card">
          <h2>Style Reference</h2>
          <p>Fonts and global resets are imported from the main index CSS file.</p>
        </article>
      </section>
    </div>
    </>
  );
}
