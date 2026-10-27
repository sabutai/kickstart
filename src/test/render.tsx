import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '../app/i18n';

/** render с роутером и инициализированным i18n — для компонентов UI-кита. */
export function renderUi(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}
