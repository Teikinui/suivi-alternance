import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardExtras from '../src/DashboardExtras.jsx';
import {
  STORAGE_KEYS,
  currentMonday,
  sanitizeGoal,
  sanitizeChecklist,
  weeklySentCount,
  extractDomain,
  domainDistribution,
  statusFunnel,
} from '../shared/dashboard-extras.js';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('dashboard-extras domain logic', () => {
  it('correctly calculates the Monday of the current week', () => {
    const wednesday = new Date(2026, 2, 25, 14, 0);
    const monday = currentMonday(wednesday);
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(2);
    expect(monday.getDate()).toBe(23);

    const sunday = new Date(2026, 2, 29, 20, 0);
    expect(currentMonday(sunday).getDate()).toBe(23);

    const mondaySelf = new Date(2026, 2, 23, 9, 0);
    expect(currentMonday(mondaySelf).getDate()).toBe(23);
  });

  it('validates and sanitizes goal and checklist storage values', () => {
    expect(sanitizeGoal('10')).toBe(10);
    expect(sanitizeGoal(50)).toBe(50);
    expect(sanitizeGoal(1)).toBe(1);
    expect(sanitizeGoal('0')).toBe(5);
    expect(sanitizeGoal('-4')).toBe(5);
    expect(sanitizeGoal('999')).toBe(5);
    expect(sanitizeGoal('invalid')).toBe(5);
    expect(sanitizeGoal(null)).toBe(5);

    expect(sanitizeChecklist(['review_offer', 'unknown_item', 42, null])).toEqual(['review_offer']);
    expect(sanitizeChecklist('not_an_array')).toEqual([]);
  });

  it('counts weekly applications respecting the archived scope', () => {
    const now = new Date(2026, 2, 25, 12, 0); // Wed 25 March 2026
    const apps = [
      { id: 1, status: 'Candidature envoyée', appliedAt: '2026-03-24', archived: false },
      { id: 2, status: 'Entretien prévu', appliedAt: '2026-03-23', archived: false },
      { id: 3, status: 'Candidature envoyée', appliedAt: '2026-03-24', archived: true }, // archived
      { id: 4, status: 'Offre reçue', appliedAt: '2026-03-25', archived: true }, // archived
    ];

    expect(weeklySentCount(apps, { now, archived: false })).toBe(2);
    expect(weeklySentCount(apps, { now, archived: true })).toBe(2);
  });

  it('extracts domains strictly from HTTP and HTTPS URLs', () => {
    expect(extractDomain('https://www.welcometothejungle.com/fr/companies/test')).toBe('welcometothejungle.com');
    expect(extractDomain('http://linkedin.com/jobs/view/123')).toBe('linkedin.com');
    expect(extractDomain('HTTPS://WWW.APEC.FR/candidat.html')).toBe('apec.fr');

    // Rejected protocols
    expect(extractDomain('file:///path/to/offer.pdf')).toBeNull();
    expect(extractDomain('javascript:alert(1)')).toBeNull();
    expect(extractDomain('ftp://ftp.example.com/job')).toBeNull();
    expect(extractDomain('invalid-url')).toBeNull();
    expect(extractDomain('')).toBeNull();
    expect(extractDomain(null)).toBeNull();
  });

  it('aggregates domain frequency sorted by count and name', () => {
    const apps = [
      { url: 'https://www.linkedin.com/jobs/1' },
      { url: 'https://linkedin.com/jobs/2' },
      { url: 'https://welcometothejungle.com/companies/x' },
      { url: 'https://www.apec.fr/job' },
      { url: 'file:///ignored.pdf' },
    ];

    const distribution = domainDistribution(apps);
    expect(distribution).toEqual([
      { domain: 'linkedin.com', count: 2 },
      { domain: 'apec.fr', count: 1 },
      { domain: 'welcometothejungle.com', count: 1 },
    ]);
  });

  it('calculates status funnel for active and archived scopes with accurate labels', () => {
    const apps = [
      { status: 'À postuler', archived: false },
      { status: 'Candidature envoyée', archived: false },
      { status: 'Entretien prévu', archived: false },
      { status: 'Offre reçue', archived: false },
      { status: 'Refusé', archived: false },
      { status: 'Offre reçue', archived: true },
    ];

    // Active
    const activeFunnel = statusFunnel(apps, { archived: false });
    expect(activeFunnel[0]).toMatchObject({ id: 'sent', count: 4, rate: 100, statusClass: 'status-1' });
    expect(activeFunnel[1]).toMatchObject({ id: 'interviews', label: 'Entretiens prévus ou offres', count: 2, rate: 50, statusClass: 'status-2' });
    expect(activeFunnel[2]).toMatchObject({ id: 'offers', label: 'Offres reçues', count: 1, rate: 25, statusClass: 'status-3' });

    // Archived
    const archivedFunnel = statusFunnel(apps, { archived: true });
    expect(archivedFunnel[0]).toMatchObject({ id: 'sent', count: 1, rate: 100 });
    expect(archivedFunnel[2]).toMatchObject({ id: 'offers', count: 1, rate: 100 });
  });

  it('handles empty status funnel gracefully without division by zero', () => {
    const funnel = statusFunnel([]);
    expect(funnel[0].rate).toBe(0);
    expect(funnel[1].rate).toBe(0);
    expect(funnel[2].rate).toBe(0);
  });
});

describe('DashboardExtras component', () => {
  const sampleApplications = [
    { id: 1, company: 'Google', position: 'Dev', status: 'Candidature envoyée', appliedAt: '2026-03-24', url: 'https://google.com/jobs', archived: false },
    { id: 2, company: 'Stripe', position: 'SRE', status: 'Entretien prévu', appliedAt: '2026-03-25', url: 'https://stripe.com/careers', archived: false },
    { id: 3, company: 'Doctolib', position: 'Lead', status: 'Offre reçue', appliedAt: '2026-03-25', url: 'https://www.doctolib.fr', archived: false },
  ];

  it('renders all four feature panels with inherited status classes and updated wording', () => {
    render(<DashboardExtras applications={sampleApplications} />);
    expect(screen.getByRole('heading', { name: 'Objectif de la semaine' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entonnoir des opportunités' })).toBeInTheDocument();
    expect(screen.getByText('Statuts actuels, pas un historique de conversions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Préparation d’entretien' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Canaux & Domaines d’offres' })).toBeInTheDocument();

    const stageInterviews = screen.getByText('Entretiens prévus ou offres').closest('.funnel-stage');
    expect(stageInterviews).toHaveClass('status-2');
  });

  it('clamps aria-valuenow to aria-valuemax when sent exceeds goal and provides descriptive aria-valuetext', () => {
    // 6 applications sent
    const apps = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      status: 'Candidature envoyée',
      appliedAt: new Date().toLocaleDateString('sv-SE'),
      archived: false,
    }));

    // Goal set to 5
    localStorage.setItem(STORAGE_KEYS.WEEKLY_GOAL, '5');
    render(<DashboardExtras applications={apps} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '5'); // Clamped to max
    expect(progressbar).toHaveAttribute('aria-valuemax', '5');
    expect(progressbar).toHaveAttribute('aria-valuetext', '6 sur 5 candidatures');
  });

  it('sanitizes invalid goal and checklist storage values on load', () => {
    localStorage.setItem(STORAGE_KEYS.WEEKLY_GOAL, '999');
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(['review_offer', 'malicious_id', 'bogus']));

    render(<DashboardExtras applications={sampleApplications} />);

    // Goal defaulted to 5
    expect(screen.getByText('5')).toBeInTheDocument();
    // Badge shows exactly 1 valid item checked
    expect(screen.getByText('1 / 5 prêt')).toBeInTheDocument();
  });

  it('allows adjusting the weekly goal and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(<DashboardExtras applications={sampleApplications} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    const plusBtn = screen.getByRole('button', { name: "Augmenter l'objectif d'une candidature" });
    await user.click(plusBtn);

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.WEEKLY_GOAL)).toBe('6');

    const minusBtn = screen.getByRole('button', { name: "Diminuer l'objectif d'une candidature" });
    await user.click(minusBtn);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('toggles checklist items, stores state in localStorage and resets on demand', async () => {
    const user = userEvent.setup();
    render(<DashboardExtras applications={sampleApplications} />);

    const itemLabel = screen.getByText('Relire l’offre et identifier les compétences clés');
    const checkbox = itemLabel.closest('label').querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CHECKLIST))).toContain('review_offer');

    const resetBtn = screen.getByRole('button', { name: 'Tout réinitialiser' });
    await user.click(resetBtn);
    expect(checkbox).not.toBeChecked();
    expect(localStorage.getItem(STORAGE_KEYS.CHECKLIST)).toBeNull();
  });

  it('displays accurate total links and handles more than 5 domains gracefully', () => {
    const manyDomains = [
      'google.com', 'stripe.com', 'doctolib.fr', 'amazon.com',
      'meta.com', 'microsoft.com', 'apple.com',
    ].map((domain, index) => ({
      id: index + 1,
      company: `Company ${index}`,
      url: `https://${domain}/jobs`,
      archived: false,
    }));

    render(<DashboardExtras applications={manyDomains} />);

    // Total links badge counts all 7
    expect(screen.getByText('7 avec lien')).toBeInTheDocument();
    expect(screen.getByText('Top 5 sur 7 domaines d’offres')).toBeInTheDocument();

    // Exactly 5 rows rendered in top domains
    expect(screen.getByText('amazon.com')).toBeInTheDocument();
    expect(screen.queryByText('microsoft.com')).not.toBeInTheDocument();
  });

  it('renders correctly under archived scope with real archived data', () => {
    const archivedApps = [
      { id: 10, company: 'Old Job', position: 'Dev', status: 'Candidature envoyée', appliedAt: '2026-03-24', archived: true },
    ];
    render(<DashboardExtras applications={archivedApps} archived={true} />);
    expect(screen.getByText(/Basé sur l'état instantané des candidatures archivées/)).toBeInTheDocument();
    expect(screen.getByText(/Candidatures envoyées du lundi au dimanche \(archives\)/)).toBeInTheDocument();
  });
});
