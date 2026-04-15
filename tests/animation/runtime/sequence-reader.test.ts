import { describe, it, expect } from 'bun:test';
import { buildSequenceReaderJs } from '../../../src/animation/runtime/sequence-reader.js';

describe('buildSequenceReaderJs', () => {
  const js = buildSequenceReaderJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should read from soom-sequence element', () => {
    expect(js).toContain("document.getElementById('soom-sequence')");
  });

  it('should parse JSON from element textContent', () => {
    expect(js).toContain('JSON.parse(seqEl.textContent)');
  });

  it('should guard against missing element', () => {
    expect(js).toContain('if (!seqEl) return');
  });

  it('should guard against invalid JSON', () => {
    expect(js).toContain('try');
    expect(js).toContain('catch(e)');
  });

  it('should extract steps array with empty fallback', () => {
    expect(js).toContain('sequence.steps || []');
  });

  it('should guard against empty steps', () => {
    expect(js).toContain('steps.length === 0');
  });
});
