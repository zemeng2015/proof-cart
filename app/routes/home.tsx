import type {Route} from './+types/home';

export const meta: Route.MetaFunction = () => [
  {title: 'Proof Cart — A considered way to shop'},
  {name: 'description', content: 'Explore synthetic products, compare sourced facts, and keep decisions yours.'},
];

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="rule" />A considered way to shop</p>
          <h1 id="home-title">Good choices.<br /><span>Grounded in proof.</span></h1>
          <p className="hero-intro">A shopping companion built around clear evidence and decisions that stay yours.</p>
          <a className="button-link" href="/catalog">Explore the catalog <span aria-hidden="true">↓</span></a>
          <p className="quiet-note">Synthetic products. No store connection required.</p>
        </div>
        <aside className="principle-card" aria-labelledby="principle-title">
          <div className="card-topline"><span>THE PROOF CART PRINCIPLE</span><span aria-hidden="true">01 / 03</span></div>
          <div className="proof-symbol" aria-hidden="true"><span>✓</span></div>
          <h2 id="principle-title">See the reason.<br />Make the call.</h2>
          <p>Explore product facts with their sources. Compare your choices and see clearly where information is missing.</p>
          <div className="card-footnote"><span aria-hidden="true">↳</span> Evidence first. Your choice, always.</div>
        </aside>
      </section>
      <section className="status-section" id="preview-status" tabIndex={-1} aria-labelledby="status-title">
        <div className="section-heading"><p className="eyebrow">Built with care, in the open</p><h2 id="status-title">A catalog you can explore.</h2><p>Search and compare synthetic products. Cart actions are still in development.</p></div>
        <dl className="status-grid">
          <div><dt><span className="status-number">01</span>Local preview</dt><dd><span className="status-tag">Available now</span><p>This page is served locally, using no store credentials or remote product data.</p></dd></div>
          <div><dt><span className="status-number">02</span>Evidence-led discovery</dt><dd><span className="status-tag planned">In development</span><p>Search, product details, comparisons, and fact evidence are available. Recommendations are still in development.</p></dd></div>
          <div><dt><span className="status-number">03</span>Buyer-controlled checkout</dt><dd><span className="status-tag planned">In development</span><p>Cart actions and checkout handoff are not available in this preview.</p></dd></div>
        </dl>
      </section>
    </>
  );
}
