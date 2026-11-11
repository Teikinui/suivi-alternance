import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';

const hash = (offer, extra = {}) => '#job-import=' + encodeURIComponent(JSON.stringify({ version: 1, source: 'schema.org', offer, ...extra }));
let rows;
beforeEach(() => {
  rows = [];
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.stubGlobal('fetch', vi.fn(async (_url, options = {}) => {
    if (options.method === 'POST') {
      const item = { id: 1, archived: false, ...JSON.parse(options.body) };
      rows.push(item);
      return { ok: true, status: 201, json: async () => item };
    }
    return { ok: true, status: 200, json: async () => [...rows] };
  }));
});
afterEach(() => { window.history.replaceState({}, '', '/'); vi.useRealTimers(); });

it('opens a validated editable draft, clears its fragment and saves only after explicit confirmation', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 2, 25, 23, 45));
  window.history.replaceState({}, '', '/?keep=1' + hash({ company: 'Atelier', position: 'Dev', url: 'https://example.com/job?id=42', notes: '<img src=x onerror=alert(1)>' }));
  const user = userEvent.setup();
  render(<App />);
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByRole('heading', { name: 'Nouvelle candidature' })).toBeInTheDocument();
  expect(dialog.getByText(/Brouillon importé — rien n’est encore enregistré/)).toBeInTheDocument();
  expect(dialog.getByLabelText('Entreprise *')).toHaveValue('Atelier');
  expect(dialog.getByLabelText('Date de candidature')).toHaveValue('2026-03-25');
  expect(dialog.getByLabelText('Statut')).toHaveValue('À postuler');
  expect(dialog.getByLabelText('Notes')).toHaveValue('<img src=x onerror=alert(1)>');
  expect(document.querySelector('img')).toBeNull();
  expect(window.location.hash).toBe('');
  expect(window.location.search).toBe('?keep=1');
  expect(fetch.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
  await user.clear(dialog.getByLabelText('Entreprise *'));
  await user.type(dialog.getByLabelText('Entreprise *'), 'Atelier corrigé');
  await user.click(dialog.getByRole('button', { name: 'Enregistrer', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Atelier corrigé' })).toBeInTheDocument();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ company: 'Atelier corrigé', status: 'À postuler', appliedAt: '2026-03-25' });
  expect(rows[0]).not.toHaveProperty('importSource');
  expect(rows[0]).not.toHaveProperty('imported');
});

it('allows incomplete drafts but requires missing fields before saving; cancel never creates anything', async () => {
  window.history.replaceState({}, '', '/' + hash({ url: 'https://example.com/job' }));
  const user = userEvent.setup();
  render(<App />);
  const dialog = within(await screen.findByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Enregistrer', exact: true }));
  expect(dialog.getByLabelText('Entreprise *')).toBeInvalid();
  expect(rows).toHaveLength(0);
  await user.click(dialog.getByRole('button', { name: 'Annuler', exact: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(rows).toHaveLength(0);
  expect(window.location.hash).toBe('');
});

it.each([
  '#job-import=%ZZ',
  hash({ company: 'A', url: 'javascript:alert(1)' }),
  hash({ company: 'A', id: 9 }),
  hash({ company: 'A', status: 'Offre reçue' }),
  hash({ company: 'A'.repeat(161) }),
  hash({ company: 'A' }, { version: 2 }),
])('refuses untrusted import %j without opening or writing a candidature', async (fragment) => {
  window.history.replaceState({}, '', '/' + fragment);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Import refusé');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(window.location.hash).toBe('');
  expect(rows).toHaveLength(0);
  expect(fetch.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
});

it('keeps saving disabled until the initial list is loaded to prevent an import/load race', async () => {
  let finishLoad;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finishLoad = resolve; }));
  window.history.replaceState({}, '', '/' + hash({ company: 'Atelier', position: 'Dev' }));
  render(<App />);
  const form = within(await screen.findByRole('dialog'));
  expect(form.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
  finishLoad({ ok: true, status: 200, json: async () => [] });
  await waitFor(() => expect(form.getByRole('button', { name: 'Enregistrer', exact: true })).toBeEnabled());
  expect(rows).toHaveLength(0);
});

it('supports prototype prefill links as draft only and never accepts their forged status or id', async () => {
  window.history.replaceState({}, '', '/?prefill=1&company=Legacy&position=Dev&status=Offre+re%C3%A7ue&id=99');
  render(<App />);
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByLabelText('Entreprise *')).toHaveValue('Legacy');
  expect(dialog.getByLabelText('Statut')).toHaveValue('À postuler');
  expect(dialog.getByRole('heading', { name: 'Nouvelle candidature' })).toBeInTheDocument();
  expect(rows).toHaveLength(0);
});

it('provides a real draggable javascript URL, clipboard help and validated destination', async () => {
  const user = userEvent.setup();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Importer une offre : installer le bookmarklet' }));
  const dialog = within(screen.getByRole('dialog'));
  const link = dialog.getByRole('link', { name: 'Suivre l’offre' });
  expect(link.getAttribute('href')).toMatch(/^javascript:/);
  expect(link).toHaveAttribute('draggable', 'true');
  await user.click(link);
  expect(open).not.toHaveBeenCalled();
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await user.click(dialog.getByRole('button', { name: 'Copier le code' }));
  expect(clipboard).toHaveBeenCalledWith(link.getAttribute('href'));
  expect(dialog.getByRole('status')).toHaveTextContent('Code copié');
  clipboard.mockRejectedValueOnce(new Error('Clipboard disabled'));
  await user.click(dialog.getByRole('button', { name: 'Copier le code' }));
  expect(dialog.getByRole('status')).toHaveTextContent('Copie automatique indisponible');
  await user.click(dialog.getByText('Installation manuelle et code'));
  const code = dialog.getByLabelText('Code du bookmarklet');
  expect(code).toHaveAttribute('readonly');
  expect(code).toHaveValue(link.getAttribute('href'));
  await user.clear(dialog.getByLabelText('Adresse de votre application'));
  await user.type(dialog.getByLabelText('Adresse de votre application'), 'javascript:alert(1)');
  expect(dialog.getByRole('alert')).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Copier le code' })).toBeDisabled();
  expect(link).toHaveAttribute('href', '#');
  await user.clear(dialog.getByLabelText('Adresse de votre application'));
  await user.type(dialog.getByLabelText('Adresse de votre application'), 'https://tracker.example.test');
  await waitFor(() => expect(link.getAttribute('href')).toMatch(/^javascript:/));
  expect(decodeURIComponent(link.getAttribute('href'))).toContain('https://tracker.example.test');
});
