import { describe, it, expect } from 'bun:test';
import { buildToggleScript, buildToggleCss } from '../../src/output/toggle.js';

describe('buildToggleScript', () => {
  const script = buildToggleScript();

  it('should return a non-empty string', () => {
    expect(script.length).toBeGreaterThan(0);
  });

  it('should be a self-executing function', () => {
    expect(script).toContain('(function()');
  });

  it('should read theme toggle button', () => {
    expect(script).toContain(".querySelector('.soom-theme-toggle')");
  });

  it('should read saved theme from localStorage', () => {
    expect(script).toContain("localStorage.getItem('soom-theme')");
  });

  it('should persist theme choice to localStorage', () => {
    expect(script).toContain("localStorage.setItem('soom-theme'");
  });

  it('should toggle between soom-dark and soom-light classes', () => {
    expect(script).toContain("'soom-dark'");
    expect(script).toContain("'soom-light'");
    expect(script).toContain('classList.remove');
    expect(script).toContain('classList.add');
  });

  it('should update button text based on theme', () => {
    expect(script).toContain('btn.textContent');
    expect(script).toContain('isDark');
  });

  it('should add click event listener to toggle button', () => {
    expect(script).toContain("addEventListener('click'");
  });

  it('should guard against missing toggle button', () => {
    expect(script).toContain('if (!btn) return');
  });

  it('should only apply saved theme if it is light or dark', () => {
    expect(script).toContain("saved === 'light'");
    expect(script).toContain("saved === 'dark'");
  });
});

describe('buildToggleCss', () => {
  const css = buildToggleCss();

  it('should return a non-empty string', () => {
    expect(css.length).toBeGreaterThan(0);
  });

  it('should style the toggle button as fixed position', () => {
    expect(css).toContain('position: fixed');
  });

  it('should place button at top-right corner', () => {
    expect(css).toContain('top: 12px');
    expect(css).toContain('right: 16px');
  });

  it('should use high z-index', () => {
    expect(css).toContain('z-index: 30');
  });

  it('should make button circular', () => {
    expect(css).toContain('border-radius: 50%');
  });

  it('should have 44px touch target', () => {
    expect(css).toContain('width: 44px');
    expect(css).toContain('height: 44px');
  });

  it('should include hover state', () => {
    expect(css).toContain('.soom-theme-toggle:hover');
  });

  it('should use backdrop blur', () => {
    expect(css).toContain('backdrop-filter: blur(4px)');
  });

  it('should use transparent background', () => {
    expect(css).toContain('rgba(128, 128, 128, 0.3)');
  });
});
