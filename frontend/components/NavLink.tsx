'use client';

import Link from 'next/link';
import React from 'react';

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: '#94a3b8',
        fontSize: '14px',
        fontWeight: 500,
        padding: '8px 14px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = '#f97316';
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(249,115,22,0.08)';
        (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(249,115,22,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
        (e.currentTarget as HTMLAnchorElement).style.border = '1px solid transparent';
      }}
    >
      {children}
    </Link>
  );
}
