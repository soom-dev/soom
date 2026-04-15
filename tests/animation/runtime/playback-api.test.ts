import { describe, it, expect } from 'bun:test';
import { buildPlaybackApiJs } from '../../../src/animation/runtime/playback-api.js';

describe('buildPlaybackApiJs', () => {
  const js = buildPlaybackApiJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should define getCurrentStepIndex function', () => {
    expect(js).toContain('function getCurrentStepIndex()');
  });

  it('should search stepOffsets in reverse order for current step', () => {
    expect(js).toContain('stepOffsets.length - 1');
    expect(js).toContain('i >= 0; i--');
  });

  it('should define seekToStep function', () => {
    expect(js).toContain('function seekToStep(n)');
  });

  it('should reset effects before seeking', () => {
    expect(js).toContain('resetPersistentEffects()');
    expect(js).toContain('timeline.seek(stepEndOffsets[n]');
  });

  it('should replay all steps up to target in seekToStep', () => {
    expect(js).toContain('for (var i = 0; i <= n');
    expect(js).toContain('soom-node-completed');
    expect(js).toContain('startMarchingLine');
  });

  it('should expose soomAnimation API on window', () => {
    expect(js).toContain('window.soomAnimation');
  });

  it('should expose play method that stops focus loops first', () => {
    expect(js).toContain('play: function()');
    expect(js).toContain('stopFocusLoops()');
  });

  it('should handle completed timeline in play by restarting', () => {
    expect(js).toContain('timeline.completed');
    expect(js).toContain('timeline.restart()');
  });

  it('should expose pause method that starts focus loops', () => {
    expect(js).toContain('pause: function()');
    expect(js).toContain('timeline.pause()');
    expect(js).toContain('startFocusLoops()');
  });

  it('should expose stepForward and stepBackward methods', () => {
    expect(js).toContain('stepForward: function()');
    expect(js).toContain('stepBackward: function()');
  });

  it('should expose goToStep method with bounds checking', () => {
    expect(js).toContain('goToStep: function(n)');
    expect(js).toContain('n <= 0');
    expect(js).toContain('n <= steps.length');
  });

  it('should expose reset method', () => {
    expect(js).toContain('reset: function()');
    expect(js).toContain('timeline.reset()');
  });

  it('should expose setSpeed method using playbackRate', () => {
    expect(js).toContain('setSpeed: function(multiplier)');
    expect(js).toContain('timeline.playbackRate');
  });

  it('should expose currentStep, totalSteps, and progress getters', () => {
    expect(js).toContain('get currentStep');
    expect(js).toContain('get totalSteps');
    expect(js).toContain('get progress');
  });

  it('should auto-play after 500ms delay', () => {
    expect(js).toContain('setTimeout');
    expect(js).toContain('timeline.play()');
    expect(js).toContain('500');
  });

  it('should restore original markers on edge completion in seekToStep', () => {
    expect(js).toContain('_origMarkerEnd');
    expect(js).toContain('_origMarkerStart');
  });

  it('should complete wordAnimation instantly when seeking', () => {
    expect(js).toContain('wordAnimation.complete()');
  });
});
