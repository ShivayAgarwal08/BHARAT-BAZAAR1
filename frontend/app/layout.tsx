/**
 * Root Layout
 * Sets up global font, metadata, and navigation bar.
 */
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import NavLink from '../components/NavLink';

export const metadata: Metadata = {
  title: 'Bharat Bazaar — AI Product Listings for Artisans',
  description:
    'Speak your product details and let AI generate a beautiful listing. An AI-powered platform for rural artisans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', background: '#0a0f1e' }}>
        {/* ─── Navigation Bar ────────────────────────────────────────────────── */}
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(10,15,30,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🪔</span>
                <span
                  className="gradient-text"
                  style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}
                >
                  Bharat Bazaar
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <NavLink href="/">🏠 Home</NavLink>
              <NavLink href="/products">📦 My Products</NavLink>
            </div>
          </div>
        </nav>

        {/* ─── Page Content ───────────────────────────────────────────────────── */}
        <main>{children}</main>

        {/* ─── Footer ─────────────────────────────────────────────────────────── */}
        <footer
          style={{
            textAlign: 'center',
            padding: '32px 24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            color: '#475569',
            fontSize: '13px',
            marginTop: '60px',
          }}
        >
          🇮🇳 Made with ❤️ for rural artisans of India &nbsp;|&nbsp; Bharat Bazaar © 2024
        </footer>
      </body>
    </html>
  );
}
