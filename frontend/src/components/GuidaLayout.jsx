import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Shared visual shell for the three Italian guides. Keeps typography and
// spacing consistent across visitor / contributor / admin pages, and
// provides a back-to-home link that returns the reader to the landing.
//
// Children should be the guide body — use the helper sub-components
// (Section, Para, Bullets, Quote, Tbl) defined below for clean Markdown-
// like rendering without pulling in a Markdown parser dependency.
export default function GuidaLayout({ eyebrow, title, lede, children }) {
  return (
    <div className="min-h-screen px-5 sm:px-8 pt-10 pb-24 max-w-3xl mx-auto" data-testid="guida-page">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--terracotta)] transition-colors"
        data-testid="guida-back"
      >
        <ArrowLeft size={14} /> Torna alla pagina principale
      </Link>

      <header className="mt-6">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-serif text-4xl sm:text-5xl mt-3 leading-tight" data-testid="guida-title">
          {title}
        </h1>
        {lede && (
          <p className="mt-4 italic font-serif text-lg text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--terracotta)] pl-4">
            {lede}
          </p>
        )}
      </header>

      <article className="mt-10 space-y-8 text-[var(--text-primary)] leading-relaxed">
        {children}
      </article>

      <footer className="mt-16 pt-6 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)] tracking-widest uppercase text-center">
        Aura — un progetto di Derrick de Kerckhove, dedicato all'Italia
      </footer>
    </div>
  );
}

// ── small reusable building blocks ─────────────────────────────────────
export function Section({ n, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl sm:text-3xl text-[var(--terracotta)]">
        {n && <span className="text-[var(--text-tertiary)] mr-2">{n}.</span>}
        {children}
      </h2>
    </section>
  );
}

export function Sub({ children }) {
  return <h3 className="font-serif text-xl mt-5">{children}</h3>;
}

export function Para({ children }) {
  return <p className="text-base">{children}</p>;
}

export function Bullets({ items }) {
  return (
    <ul className="list-disc list-outside pl-6 space-y-1.5 text-base marker:text-[var(--terracotta)]">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export function Numbered({ items }) {
  return (
    <ol className="list-decimal list-outside pl-6 space-y-1.5 text-base marker:text-[var(--terracotta)]">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  );
}

export function Quote({ children }) {
  return (
    <blockquote className="border-l-2 border-[var(--warm-ochre)] pl-4 italic font-serif text-[var(--text-secondary)]">
      {children}
    </blockquote>
  );
}

export function Tbl({ headers, rows }) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {headers.map((h, i) => (
              <th key={i} className="text-left p-2.5 eyebrow text-[var(--text-tertiary)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--border)]/50 align-top">
              {row.map((cell, ci) => (
                <td key={ci} className="p-2.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Hr() {
  return <hr className="border-t border-[var(--border)] my-2" />;
}
