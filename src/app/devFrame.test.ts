import { describe, expect, it } from 'vitest';
import { applyDevFrame } from './devFrame';

describe('applyDevFrame', () => {
  it('в режиме разработки ставит класс рамки на <html>', () => {
    const root = document.createElement('html');
    applyDevFrame(true, root);
    expect(root.classList.contains('dev-frame')).toBe(true);
  });

  it('в продакшене класса нет (и убирает, если был)', () => {
    const root = document.createElement('html');
    root.classList.add('dev-frame');
    applyDevFrame(false, root);
    expect(root.classList.contains('dev-frame')).toBe(false);
  });

  it('по умолчанию зависит от режима сборки: в тестах это не production', () => {
    applyDevFrame();
    expect(document.documentElement.classList.contains('dev-frame')).toBe(import.meta.env.DEV);
    document.documentElement.classList.remove('dev-frame');
  });
});
