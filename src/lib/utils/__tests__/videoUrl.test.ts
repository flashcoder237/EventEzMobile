/**
 * Tests de videoUrl.ts — embed YouTube/Vimeo (mirror backend/web).
 * Couvre tous les formats YouTube (watch, youtu.be, shorts, embed) et Vimeo,
 * + isExternalVideoUrl et getVideoProvider, + les entrées invalides.
 */
import { getEmbedUrl, isExternalVideoUrl, getVideoProvider } from '../videoUrl';

describe('getEmbedUrl — YouTube', () => {
  it('watch?v=ID → embed', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=abc123')).toContain('youtube.com/embed/abc123');
  });
  it('youtu.be/ID → embed', () => {
    expect(getEmbedUrl('https://youtu.be/xyz789')).toContain('youtube.com/embed/xyz789');
  });
  it('shorts/ID → embed', () => {
    expect(getEmbedUrl('https://www.youtube.com/shorts/short99')).toContain('youtube.com/embed/short99');
  });
  it('déjà en /embed/ → renvoyé tel quel', () => {
    const url = 'https://www.youtube.com/embed/keep1';
    expect(getEmbedUrl(url)).toBe(url);
  });
  it('m.youtube.com supporté', () => {
    expect(getEmbedUrl('https://m.youtube.com/watch?v=mob1')).toContain('embed/mob1');
  });
  it('inclut les params de lecture auto (autoplay/mute/loop)', () => {
    const out = getEmbedUrl('https://youtu.be/p1');
    expect(out).toMatch(/autoplay=1/);
    expect(out).toMatch(/mute=1/);
    expect(out).toMatch(/loop=1/);
  });
});

describe('getEmbedUrl — Vimeo', () => {
  it('vimeo.com/ID → player embed', () => {
    expect(getEmbedUrl('https://vimeo.com/123456')).toContain('player.vimeo.com/video/123456');
  });
  it('player.vimeo.com/video/ID → renvoyé tel quel', () => {
    const url = 'https://player.vimeo.com/video/keep2';
    expect(getEmbedUrl(url)).toBe(url);
  });
});

describe('getEmbedUrl — invalides', () => {
  it.each(['', 'not a url', 'https://tiktok.com/@x/video/1', 'https://youtube.com/watch', 'https://vimeo.com/notanumber'])(
    'renvoie "" pour "%s"', (u) => { expect(getEmbedUrl(u)).toBe(''); },
  );
});

describe('isExternalVideoUrl', () => {
  it('true pour une URL embeddable, false sinon', () => {
    expect(isExternalVideoUrl('https://youtu.be/a')).toBe(true);
    expect(isExternalVideoUrl('https://example.com')).toBe(false);
    expect(isExternalVideoUrl('')).toBe(false);
  });
});

describe('getVideoProvider', () => {
  it('identifie youtube / vimeo / null', () => {
    expect(getVideoProvider('https://www.youtube.com/watch?v=x')).toBe('youtube');
    expect(getVideoProvider('https://vimeo.com/999')).toBe('vimeo');
    expect(getVideoProvider('https://dailymotion.com/x')).toBeNull();
    expect(getVideoProvider('')).toBeNull();
    expect(getVideoProvider('pas une url')).toBeNull();
  });
  it('null si host connu mais URL non embeddable', () => {
    expect(getVideoProvider('https://youtube.com/watch')).toBeNull();
  });
});
