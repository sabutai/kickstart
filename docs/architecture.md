# Архитектура

Источник: живой документ «KickStart Kids: план реализации Android-приложения (React + Capacitor)» (claude.ai). Здесь — то, что нужно для кода.

## Стек

| Слой | Выбор |
| --- | --- |
| Сборка | Vite + React 19 + TypeScript (strict) |
| Нативная оболочка | Capacitor 8, только Android |
| Роутинг | React Router, `createHashRouter` (в WebView нет сервера для history API) |
| Состояние | Effector (`effector`, `effector-react`) |
| Хранилище | `@capacitor/preferences` — настройки; журнал тренировок — SQLite (`@capacitor-community/sqlite`) или IndexedDB (Dexie) — решить на этапе 2 |
| Валидация | Zod 4 (`z.email()`, не `z.string().email()`) |
| i18n | i18next + react-i18next, MVP — только `ru` |
| Стили | SASS + CSS Modules, токены в `src/shared/styles/_tokens.scss` |
| Даты | date-fns, неделя с понедельника |
| Тесты | Vitest + React Testing Library (jsdom), позже Playwright для E2E |
| Линт/формат | oxlint, Prettier |

## Структура

```
src/
  app/            роутер, лейауты, i18n, аппаратная «Назад»
  content/        программа: упражнения, уровни, шаблон занятия (JSON + Zod) — этап 2
  features/       onboarding, home, library, exercise, timer (проигрыватель), calendar, profile
  entities/       Session, Exercise, Progress — типы, сторы, селекторы — этап 2
  shared/
    config/       APP_CONFIG (appId, имя) — единственный источник
    i18n/         словари
    lib/platform/ обёртки над плагинами Capacitor с веб-фолбэками
    styles/       токены и глобальные стили
    ui/           переиспользуемые компоненты
android/          нативный проект Capacitor (коммитится)
docs/             планы, архитектура, макеты
```

Правило: фичи не импортируют `@capacitor/*` напрямую — только через `shared/lib/platform`.

## Модель данных

Контент — статический JSON внутри сборки, проверяется Zod при старте. Пользовательские данные — в локальном хранилище с версией схемы.

```ts
type Lang = 'ru' | 'en';
type Category = 'warmup' | 'balance' | 'strength' | 'technique' | 'games' | 'mobility';

type Exercise = {
  id: string;                    // 'skating-jumps'
  category: Category;
  title: Record<Lang, string>;
  why: Record<Lang, string>;
  levels: ExerciseLevel[];       // 1..5 для упражнений программы
  safety?: { homeMaxLevel?: number; needsMat?: boolean }; // перекаты: не выше 3, на матрасе
};

type ExerciseLevel = {
  level: number;
  steps: Record<Lang, string[]>;
  volume: { sets: number; reps?: number; perSide?: boolean; workSec?: number; restSec: number };
  demo: { kind: 'video' | 'image'; src: string; poster: string }; // {exerciseId}_l{level}.mp4/.webp
};

type SessionTemplate = {
  parts: { kind: 'game' | 'program' | 'ball' | 'feet' | 'cooldown'; minutes: number }[];
};

// Все пользовательские записи — с SyncMeta (под будущую синхронизацию, этап 2 после MVP).
type SyncMeta = { id: string; updatedAt: string; deletedAt?: string };

type Profile = SyncMeta & { name: string; age: number; lang: Lang; mode: 'child' | 'coach'; coachPinHash?: string };
type Schedule = SyncMeta & { startDate: string; clubDays: Weekday[]; homeDays: Weekday[]; weeks: number };
type PlannedSession = SyncMeta & {
  date: string; stage: 1 | 2 | 3;
  kind: 'home' | 'club' | 'test';
  status: 'planned' | 'done' | 'skipped'; // для 'club' done = «был на тренировке»
  movedFrom?: string;
};
type SessionLog = SyncMeta & {
  sessionId: string; startedAt: string; finishedAt?: string;
  items: { exerciseId: string; level: number; setsDone: number; techniqueRating?: 1 | 2 | 3 | 4 | 5 }[];
};
type ExerciseProgress = SyncMeta & { exerciseId: string; level: number; cleanSessionsInRow: number };
type MiniTest = SyncMeta & { date: string; soleTaps30s?: number; oneLegEyesClosedSec?: number; snailSec?: number };
```

## Бизнес-правила (обязательно с юнит-тестами)

- **Календарь** из `Schedule`: домашние дни × 12 недель; этап по номеру недели (1–4, 5–8, 9–12); мини-тесты в конце недель 4, 8, 12 и стартовый — в первое занятие.
- **Перенос:** сб → вс одним тапом; пропуск не создаёт «долг», календарь не сдвигается.
- **Повышение уровня:** предлагается при `cleanSessionsInRow ≥ 3` (оценка техники 4–5); уровни не пропускаются; учитывать `homeMaxLevel`; подтверждает взрослый под PIN.
- **Серия** — подряд выполненные запланированные занятия (домашние и «Был» в секции), а не дни подряд.
- **Секция** — только отметка «Был», засчитывается в цель недели и серию.
- Один ребёнок на устройство, но профиль с `id`.

## Проигрыватель

Машина состояний: `intro → work → rest → work … → exerciseDone (оценка) → nextExercise … → sessionDone`, плюс `paused` из любого состояния.

- Упражнения на повторы (прыжки, перекаты) — фаза `work` по кнопке «Готово»; на время — по таймеру.
- Время считается от `Date.now()`, а не тиками `setInterval` — без дрейфа при сворачивании.
- При уходе в фон — автопауза (`appLifecycle.onActiveChange`). Keep-awake на время занятия. Вибрация на смене фазы.

## Экраны

Макеты — `docs/design/*.dc.html` (см. `docs/design/README.md`). Режим «Ребёнок/Взрослый» меняет акцент (`#FF5A1F` / `#FFFFFF`) и состав блоков, но не маршруты; переключается атрибутом `data-mode` на `<html>`.

| Маршрут | Экран | Макет |
| --- | --- | --- |
| `/` | Главная | `Main.dc.html` |
| `/library` | Упражнения | `Library.dc.html` |
| `/timer` | Таймер / проигрыватель | `Timer.dc.html`, `RestTimer.dc.html` |
| `/calendar` | Календарь | `Calendar.dc.html` |
| `/profile` | Профиль | `Profile.dc.html` |
| `/exercise/:exerciseId` | Экран упражнения | `ExerciseDetail.dc.html` |
| `/onboarding` | Онбординг (4 шага) | `Onboarding1–4.dc.html` |

## Контент

- Видео: 9:16, 720×1280, 4–8 с, без звука, бесшовная петля, H.264 MP4 ≤ 1.5 МБ; превью WebP. В MVP всё внутри APK (`public/content/`).
- Фоны экранов: WebP 1080×2340, до 300 КБ, `bg_{screen}.webp`. Читаемость обеспечивается в коде: градиенты сверху/снизу и полупрозрачные карточки.
- Бренд FIFA в приложении и описании не используется.

## Разрешения Android

Только `POST_NOTIFICATIONS` (запрос в онбординге) и, если нужно, `SCHEDULE_EXACT_ALARM`. Камера, геолокация и интернет не нужны.
