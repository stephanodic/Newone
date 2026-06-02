/**
 * Componenti tipografici del design system.
 * Usano i token CSS definiti in src/styles/tokens.css.
 *
 * Uso:
 *   <Display>Saldo Totale</Display>
 *   <Title className="mb-2">Cronologia</Title>
 *   <Body>Testo paragrafo</Body>
 *   <Caption>12 gen 2026</Caption>
 *   <Label>Categoria</Label>
 *   <Micro>TOP</Micro>
 */
import React from 'react';
import { cn } from '@/lib/utils';

export const Display = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1
    className={cn(
      'text-[length:var(--text-display)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-display)] text-[color:var(--ink)]',
      className,
    )}
    {...p}
  />
);

export const Title = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn(
      'text-[length:var(--text-title)] font-semibold leading-[var(--lh-snug)] tracking-[var(--ls-tight)] text-[color:var(--ink)]',
      className,
    )}
    {...p}
  />
);

export const Body = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      'text-[length:var(--text-body)] font-medium leading-[var(--lh-normal)] text-[color:var(--ink)]',
      className,
    )}
    {...p}
  />
);

export const Caption = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'text-[length:var(--text-caption)] font-semibold leading-[var(--lh-snug)] text-[color:var(--ink-muted)]',
      className,
    )}
    {...p}
  />
);

export const Label = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'text-[length:var(--text-caption)] font-semibold uppercase tracking-[var(--ls-label)] text-[color:var(--ink-subtle)]',
      className,
    )}
    {...p}
  />
);

export const Micro = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'text-[length:var(--text-micro)] font-semibold leading-tight text-[color:var(--ink-muted)]',
      className,
    )}
    {...p}
  />
);
