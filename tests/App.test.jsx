import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { EMPTY_APPLICATION } from '../shared/domain.js';

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

describe('application interface', () => {
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
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('heading', { name: 'Atelier' })).toBeInTheDocument();
    const card = screen.getByRole('heading', { name: 'Atelier' }).closest('article');
    await user.click(within(card).getByRole('button', { name: 'Modifier' }));
    const edit = screen.getByRole('dialog');
    await user.clear(within(edit).getByLabelText('Poste *'));
    await user.type(within(edit).getByLabelText('Poste *'), 'Lead designer');
    await user.click(within(edit).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Lead designer')).toBeInTheDocument();
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
});
