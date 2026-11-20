import { describe, it, expect } from 'vitest';
import { CHARACTERS, CHARACTER_STORAGE_KEY, loadCharacter, parseCharacter, portraitUrl, saveCharacter, type CharacterStorage } from '../src/characters';

describe('independent local companion preference', () => {
  it('has nineteen distinct characters matching the copied portrait ids', () => {
    expect(CHARACTERS).toHaveLength(19);
    expect(new Set(CHARACTERS.map(c => c.id)).size).toBe(19);
    expect(CHARACTERS.every(c => c.name && c.short)).toBe(true);
    expect(CHARACTERS[0].id).toBe('classic');
    expect(CHARACTER_STORAGE_KEY).toBe('puzzle-sudoku-character-v1');
  });
  for (const character of CHARACTERS) it(`roundtrips ${character.id}, has local relative WebP URL`, () => {
    let text: string | null = null, lastKey = '';
    const storage: CharacterStorage = { getItem: key => { lastKey = key; return text; }, setItem: (key, value) => { lastKey = key; text = value; } };
    expect(saveCharacter(() => storage, character.id)).toBe(true);
    expect(lastKey).toBe(CHARACTER_STORAGE_KEY);
    expect(loadCharacter(() => storage)).toEqual({ character, available: true });
    expect(portraitUrl(character.id)).toBe(`./characters-2d/${character.id}.webp`);
  });
  for (const text of [null, '', '{broken', 'null', 'true', '[]', '"chiikawa"', '{"version":2,"id":"chiikawa"}', '{"version":1,"id":"unknown"}', '{"version":1,"id":"../../outside"}', '{"version":1,"id":1}', '{"version":1}', ' '.repeat(257)]) it(`invalid preference safely defaults: ${String(text).slice(0, 50)}`, () => {
    expect(parseCharacter(text)).toBe(CHARACTERS[0]);
  });
  it('catches throwing storage accessor, getItem and setItem independently', () => {
    const getter = () => { throw new Error('blocked accessor'); };
    const denied: CharacterStorage = { getItem() { throw new Error('blocked read'); }, setItem() { throw new Error('quota'); } };
    expect(loadCharacter(getter)).toEqual({ character: CHARACTERS[0], available: false });
    expect(loadCharacter(() => denied)).toEqual({ character: CHARACTERS[0], available: false });
    expect(saveCharacter(getter, 'chiikawa')).toBe(false);
    expect(saveCharacter(() => denied, 'chiikawa')).toBe(false);
  });
  it('rejects saving an invalid id without accessing storage', () => {
    let touched = false;
    expect(saveCharacter(() => { touched = true; throw new Error(); }, 'not-a-character')).toBe(false);
    expect(touched).toBe(false);
  });
});
