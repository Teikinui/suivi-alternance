import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { EMPTY_APPLICATION } from '../shared/domain.js';
import * as exportModule from '../src/export.js';

const item = { ...EMPTY_APPLICATION, id: 1, company: 'Horizon', position: 'Développeuse', status: 'Candidature envoyée', appliedAt: '2026-03-20', archived: false };
let rows;
beforeEach(() => {
  rows = [{ ...item }];
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (options.method === 'POST') {
      const created = { ...JSON.parse(options.body), id: 2, archived: false };
      rows.push(created);
      return { ok: true, status: 201, json: async () => created };
    }
    if (options.method === 'PATCH') {
      const id = Number(url.split('/').pop());
      rows = rows.map((row) => row.id === id ? { ...row, ...JSON.parse(options.body) } : row);
      return { ok: true, status: 200, json: async () => rows.find((row) => row.id === id) };
    }
    if (options.method === 'DELETE') {
      rows = rows.filter((row) => row.id !== Number(url.split('/').pop()));
      return { ok: true, status: 204 };
    }
    return { ok: true, status: 200, json: async () => rows.filter((row) => row.archived === url.includes('archived=true')) };
  }));
});

afterEach(() => vi.useRealTimers());

describe('application interface', () => {
  it('defaults new applications to the local day and saves that date', async () => {
    // Late evening also catches UTC-based defaults when run in a western time zone.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 25, 23, 45));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: /Nouvelle candidature/ }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Date de candidature')).toHaveValue('2026-03-25');
    await user.type(dialog.getByLabelText('Entreprise *'), 'Aujourd’hui');
    await user.type(dialog.getByLabelText('Poste *'), 'Dev');
    await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByRole('heading', { name: 'Aujourd’hui' });
    expect(rows.find((row) => row.company === 'Aujourd’hui').appliedAt).toBe('2026-03-25');
  });

  it.each(['2026-03-20', ''])('preserves the existing date %j during editing', async (appliedAt) => {
    rows[0].appliedAt = appliedAt;
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Date de candidature')).toHaveValue(appliedAt);
    await user.type(dialog.getByLabelText('Notes'), 'Date conservée');
    await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Date conservée');
    expect(rows[0].appliedAt).toBe(appliedAt);
  });
  it('renders data, accessible charts, table and search', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Horizon' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Candidatures par semaine' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tableau/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'aucune');
    expect(screen.getByText(/Aucune candidature ne correspond/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(within(screen.getByRole('table')).getByText('Horizon')).toBeInTheDocument();
  });

  it('creates and edits a candidature via the form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: /Nouvelle candidature/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Entreprise *'), 'Atelier');
    await user.type(within(dialog).getByLabelText('Poste *'), 'Designer');
    await user.type(within(dialog).getByLabelText('Notes'), 'À préparer');
    const date = within(dialog).getByLabelText('Date de candidature');
    fireEvent.change(date, { target: { value: '2026-02-14' } });
    expect(date).toHaveValue('2026-02-14');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('heading', { name: 'Atelier' })).toBeInTheDocument();
    const card = screen.getByRole('heading', { name: 'Atelier' }).closest('article');
    await user.click(within(card).getByRole('button', { name: 'Modifier' }));
    const edit = screen.getByRole('dialog');
    expect(within(edit).getByLabelText('Date de candidature')).toHaveValue('2026-02-14');
    expect(rows.find((row) => row.company === 'Atelier').appliedAt).toBe('2026-02-14');
    await user.clear(within(edit).getByLabelText('Poste *'));
    await user.type(within(edit).getByLabelText('Poste *'), 'Lead designer');
    await user.click(within(edit).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Lead designer')).toBeInTheDocument();
  });

  it('clears only the search and returns focus without resetting status or sort', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'Candidature envoyée');
    await user.selectOptions(screen.getByLabelText('Trier par date'), 'asc');
    const search = screen.getByRole('searchbox');
    await user.type(search, 'absent');
    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('Candidature envoyée');
    expect(screen.getByLabelText('Trier par date')).toHaveValue('asc');
    expect(screen.getByRole('heading', { name: 'Horizon' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).not.toBeInTheDocument();
  });

  it('groups the form and updates the notes counter without changing its accessible name', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: /Nouvelle candidature/ }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('group', { name: 'L’opportunité' })).toBeInTheDocument();
    const notes = within(dialog.getByRole('group', { name: 'Le suivi' })).getByLabelText('Notes');
    expect(notes).toHaveAccessibleDescription('0 / 10 000 caractères');
    await user.type(notes, 'Bonjour');
    expect(notes).toHaveAccessibleDescription('7 / 10 000 caractères');
    expect(notes).toHaveAttribute('maxlength', '10000');
    await user.clear(notes);
    expect(notes).toHaveAccessibleDescription('0 / 10 000 caractères');
  });

  it('keeps overdue styling and the absolute date alongside relative reminder labels', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 25, 23, 45));
    rows[0].followUpAt = '2026-03-24';
    const user = userEvent.setup();
    render(<App />);
    const label = await screen.findByText('◷ Relance · En retard de 1 jour');
    expect(label.closest('.reminder')).toHaveClass('due');
    expect(within(label.closest('.reminder')).getByText('24 mars 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vue Tableau' }));
    expect(within(screen.getByRole('table')).getByText('◷ Relance · En retard de 1 jour').closest('.reminder')).toHaveClass('due');
  });

  it('changes status, archives, restores and deletes with confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await screen.findByText('Horizon');
    await user.selectOptions(screen.getByLabelText('Statut de Horizon — Développeuse'), 'Entretien prévu');
    await waitFor(() => expect(screen.getByLabelText('Statut de Horizon — Développeuse')).toHaveValue('Entretien prévu'));
    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    await waitFor(() => expect(screen.queryByText('Horizon')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Archives', exact: true }));
    expect(await screen.findByText('Horizon')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restaurer' }));
    await waitFor(() => expect(screen.queryByText('Horizon')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Mes candidatures' }));
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: 'Supprimer Horizon — Développeuse' }));
    await waitFor(() => expect(screen.queryByText('Horizon')).not.toBeInTheDocument());
    expect(window.confirm).toHaveBeenCalledOnce();
  });

  it('shows errors and retries instead of hiding failed requests', async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValueOnce(new Error('Serveur indisponible'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Serveur indisponible');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Horizon')).toBeInTheDocument();
  });

  it('preserves the form when saving fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Échec enregistrement' }) });
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Échec enregistrement');
    expect(screen.getByLabelText('Entreprise *')).toHaveValue('Horizon');
  });

  it('persists the light/dark preference locally', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: 'Activer le mode sombre' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Activer le mode clair' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it.each([[2, '2026-03-27'], [7, '2026-04-01']])('snoozes a due follow-up by %i local calendar days without changing other fields', async (days, expected) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 25, 23, 45));
    rows[0].followUpAt = '2026-03-01';
    rows[0].contact = 'rh@example.com';
    rows[0].url = 'https://example.com/job';
    const user = userEvent.setup();
    render(<App />);
    const report = await screen.findByRole('button', { name: `Reporter Horizon de ${days} jours à partir d’aujourd’hui` });
    expect(screen.getByRole('link', { name: 'rh@example.com' })).toHaveAttribute('href', 'mailto:rh%40example.com');
    expect(screen.getByRole('link', { name: 'Voir l’offre de Horizon' })).toHaveAttribute('href', rows[0].url);
    await user.click(report);
    await waitFor(() => expect(rows[0].followUpAt).toBe(expected));
    expect(rows[0].status).toBe('Candidature envoyée');
    const patch = fetch.mock.calls.find(([, options]) => options.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ followUpAt: expected });
    expect(await screen.findByText('Aucune relance à traiter. Vous êtes à jour !')).toBeInTheDocument();
  });

  it('keeps due actions on a failed snooze, shows the error and allows retry', async () => {
    rows[0].followUpAt = '2000-01-01';
    const user = userEvent.setup();
    render(<App />);
    const report = await screen.findByRole('button', { name: 'Reporter Horizon de 2 jours à partir d’aujourd’hui' });
    fetch.mockRejectedValueOnce(new Error('Report indisponible'));
    await user.click(report);
    expect(await screen.findByRole('alert')).toHaveTextContent('Report indisponible');
    expect(rows[0].followUpAt).toBe('2000-01-01');
    expect(report).toBeEnabled();
    await user.click(report);
    await waitFor(() => expect(rows[0].followUpAt).not.toBe('2000-01-01'));
  });

  it('combines the quick due filter with search/status and excludes archives from actions', async () => {
    rows[0].followUpAt = '2000-01-01';
    rows.push({ ...item, id: 2, company: 'Future', followUpAt: '2999-01-01' }, { ...item, id: 3, company: 'Archive', followUpAt: '2000-01-01', archived: true });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Future' });
    await user.click(screen.getByRole('button', { name: 'Relances à faire (1)' }));
    expect(screen.getByRole('button', { name: 'Relances à faire (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'Future' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'absent');
    expect(screen.getByText(/Aucune candidature ne correspond/)).toBeInTheDocument();
    // The action center ignores search filters and still exposes the due item.
    expect(screen.getByRole('button', { name: 'Ouvrir Horizon — Développeuse' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(screen.getByRole('heading', { name: 'Future' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Archives', exact: true }));
    await screen.findByRole('heading', { name: 'Archive' });
    expect(screen.queryByText('À traiter aujourd’hui')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Relances à faire/ })).not.toBeInTheDocument();
  });

  it('shows the interview access snapshot and explicitly declines an invented response delay', async () => {
    rows.push({ ...item, id: 2, company: 'Entretien', status: 'Entretien prévu' }, { ...item, id: 3, company: 'Offre', status: 'Offre reçue' }, { ...item, id: 4, company: 'Refus', status: 'Refusé' }, { ...item, id: 5, company: 'Brouillon', status: 'À postuler' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Horizon' });
    const card = screen.getByText('Accès aux entretiens').closest('.stat-card');
    expect(within(card).getByText('50%')).toBeInTheDocument();
    expect(within(card).getByText('2 entretien(s) ou offre(s) / 4 envoyée(s)')).toBeInTheDocument();
    await user.click(screen.getByText('Comprendre les indicateurs'));
    expect(screen.getByText(/Délai moyen de réponse indisponible/)).toBeInTheDocument();
  });

  it('exports only the selected active/archive scope and respects filtered versus whole-tab selection', async () => {
    const download = vi.spyOn(exportModule, 'downloadExport').mockImplementation(() => {});
    rows.push({ ...item, id: 2, company: 'Seconde' }, { ...item, id: 3, company: 'Archive', archived: true });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Horizon' });
    await user.type(screen.getByRole('searchbox'), 'Horizon');
    await user.click(screen.getByRole('button', { name: 'Exporter CSV' }));
    expect(download.mock.calls[0][0].applications.map((row) => row.id)).toEqual([1]);
    expect(download.mock.calls[0][1]).toBe('csv');
    await user.selectOptions(screen.getByLabelText('Périmètre de l’export'), 'tab');
    await user.click(screen.getByRole('button', { name: 'Exporter JSON' }));
    expect(download.mock.calls[1][0].applications.map((row) => row.id).sort()).toEqual([1, 2]);
    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
    await user.click(screen.getByRole('button', { name: 'Archives', exact: true }));
    await screen.findByRole('heading', { name: 'Archive' });
    await user.click(screen.getByRole('button', { name: 'Exporter JSON' }));
    expect(download.mock.calls[2][0].applications.map((row) => row.id)).toEqual([3]);
    expect(download.mock.calls[2][0].scope.archived).toBe(true);
  });

  it('displays a visible toast notification on action and allows dismissing it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Horizon');
    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Candidature mise à jour.');
    expect(toast).toHaveClass('toast-notification');
    await user.click(within(toast).getByRole('button', { name: 'Fermer la notification' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
