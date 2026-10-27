// Все строки интерфейса — только через i18n. В MVP один язык (ru), EN — в 1.1.
export const ru = {
  nav: {
    label: 'Основная навигация',
    home: 'Главная',
    library: 'Упражнения',
    timer: 'Таймер',
    calendar: 'Календарь',
    profile: 'Профиль',
  },
  screens: {
    home: 'Главная',
    library: 'Упражнения',
    timer: 'Таймер',
    calendar: 'Календарь',
    profile: 'Профиль',
    exercise: 'Упражнение',
    onboarding: 'Знакомство',
  },
  ui: {
    level: 'Уровень {{level}} из {{max}}',
    levelShort: 'Ур. {{level}}',
    minutes: '{{count}} мин',
    loading: 'Загрузка',
    years_one: '{{count}} год',
    years_few: '{{count}} года',
    years_many: '{{count}} лет',
    years_other: '{{count}} года',
    step: 'Шаг {{current}} из {{total}}',
    weekday: {
      1: { letter: 'П', short: 'Пн', full: 'Понедельник' },
      2: { letter: 'В', short: 'Вт', full: 'Вторник' },
      3: { letter: 'С', short: 'Ср', full: 'Среда' },
      4: { letter: 'Ч', short: 'Чт', full: 'Четверг' },
      5: { letter: 'П', short: 'Пт', full: 'Пятница' },
      6: { letter: 'С', short: 'Сб', full: 'Суббота' },
      7: { letter: 'В', short: 'Вс', full: 'Воскресенье' },
    },
    pin: {
      erase: 'Стереть',
      entered: 'Введено цифр: {{count}} из {{total}}',
    },
    day: {
      today: 'сегодня',
      planned: 'запланировано',
      done: 'выполнено',
      skipped: 'пропущено',
    },
  },
  common: {
    back: 'Назад',
    comingSoon: 'Экран появится на этапе {{stage}}',
  },
} as const;
