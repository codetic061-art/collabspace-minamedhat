import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(resolve(process.cwd(), 'src/shared/tokens/tokens.css'), 'utf8');

describe('Design tokens stylesheet', () => {
  it('loads only the approved D4 Inter and Rubik latin weights without Google Fonts CDNs', () => {
    expect(tokensCss).toContain("@import '@fontsource/inter/latin-400.css';");
    expect(tokensCss).toContain("@import '@fontsource/inter/latin-500.css';");
    expect(tokensCss).toContain("@import '@fontsource/inter/latin-600.css';");
    expect(tokensCss).toContain("@import '@fontsource/inter/latin-700.css';");
    expect(tokensCss).toContain("@import '@fontsource/rubik/latin-400.css';");

    expect(tokensCss).not.toContain('plus-jakarta-sans');
    expect(tokensCss).not.toContain('fonts.googleapis.com');
    expect(tokensCss).not.toContain('fonts.gstatic.com');
    expect(tokensCss).not.toContain('italic');
    expect(tokensCss).not.toContain('800');
  });

  it('defines design tokens including accessible body and danger text colors', () => {
    const requiredTokens = [
      '--color-primary: #005afb;',
      '--color-primary-tint: #e6efff;',
      '--color-canvas: #f6f8fa;',
      '--color-surface: #ffffff;',
      '--color-ink: #000712;',
      '--color-heading: #1f2937;',
      '--color-body: #606c80;',
      '--color-border-input: #cbd5e0;',
      '--color-danger: #bf2823;',
      '--color-success: #2ba52e;',
      '--color-status-pending: #606c80;',
      '--color-status-on-hold: #fa9e00;',
      '--radius-pill: 100px;',
      '--radius-card: 16px;',
      '--radius-modal: 24px;',
      '--radius-settings: 32px;',
      '--radius-input: 12px;',
      'prefers-reduced-motion: reduce',
    ];

    for (const token of requiredTokens) {
      expect(tokensCss).toContain(token);
    }
  });
});
