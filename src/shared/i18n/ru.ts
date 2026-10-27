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
  common: {
    back: 'Назад',
    comingSoon: 'Экран появится на этапе {{stage}}',
  },
} as const;
