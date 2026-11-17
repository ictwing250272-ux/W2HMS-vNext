import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders the home page with the dev banner', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'W2HMS vNext' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('DEV');
    expect(screen.getByTestId('backend')).toHaveTextContent('Firebase Emulator (demo)');
  });

  it('renders the not-found page for unknown routes', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: 'ไม่พบหน้าที่ต้องการ' })).toBeInTheDocument();
  });
});
