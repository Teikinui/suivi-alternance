import React, { useState } from 'react';
import './dashboard-extras.css';
import {
  STORAGE_KEYS,
  DEFAULT_WEEKLY_GOAL,
  DEFAULT_CHECKLIST,
  sanitizeGoal,
  sanitizeChecklist,
  weeklySentCount,
  domainDistribution,
  statusFunnel,
} from '../shared/dashboard-extras.js';

export default function DashboardExtras({ applications = [], archived = false }) {
  // 1. Weekly Goal State
  const [goal, setGoal] = useState(() => {
    try {
      return sanitizeGoal(localStorage.getItem(STORAGE_KEYS.WEEKLY_GOAL));
    } catch {
      return DEFAULT_WEEKLY_GOAL;
    }
  });

  const updateGoal = (delta) => {
    setGoal((prev) => {
      const next = Math.max(1, Math.min(50, prev + delta));
      try {
        localStorage.setItem(STORAGE_KEYS.WEEKLY_GOAL, String(next));
      } catch {
        /* Storage may be disabled */
      }
      return next;
    });
  };

  // 2. Checklist State (filtered against known valid IDs)
  const [checkedIds, setCheckedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      if (stored) {
        return new Set(sanitizeChecklist(JSON.parse(stored)));
      }
    } catch {
      /* Fallback to empty */
    }
    return new Set();
  });

  const toggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      try {
        localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(Array.from(next)));
      } catch {
        /* Storage may be disabled */
      }
      return next;
    });
  };

  const resetChecklist = () => {
    setCheckedIds(new Set());
    try {
      localStorage.removeItem(STORAGE_KEYS.CHECKLIST);
    } catch {
      /* Storage may be disabled */
    }
  };

  // Calculations scoped by the active tab (archived or not)
  const sentThisWeek = weeklySentCount(applications, { archived });
  const goalProgress = Math.min(100, Math.round((sentThisWeek / goal) * 100));
  const clampedValueNow = Math.min(goal, sentThisWeek);
  const funnel = statusFunnel(applications, { archived });

  // Domain Distribution (all vs top 5)
  const allDomains = domainDistribution(applications);
  const totalLinked = allDomains.reduce((sum, d) => sum + d.count, 0);
  const topDomains = allDomains.slice(0, 5);

  return (
    <section className="dashboard-extras" aria-label="Indicateurs complémentaires et préparation">
      <div className="dashboard-extras-grid">
        {/* Panel 1: Objectif Hebdomadaire */}
        <article className="extra-panel goal-panel" aria-label="Objectif de candidatures hebdomadaire">
          <div className="extra-header">
            <div>
              <h3>Objectif de la semaine</h3>
              <p className="extra-subtitle">Candidatures envoyées du lundi au dimanche ({archived ? 'archives' : 'actives'})</p>
            </div>
            <span className="extra-badge">{goalProgress}% atteint</span>
          </div>

          <div className="goal-content">
            <div className="goal-status-row">
              <span className="goal-numbers">
                {sentThisWeek} <small>/ {goal} envoyée{goal > 1 ? 's' : ''}</small>
              </span>
              <div className="goal-controller" aria-label="Ajuster l'objectif hebdomadaire">
                <span>Cible :</span>
                <div className="goal-buttons">
                  <button
                    type="button"
                    className="goal-btn"
                    onClick={() => updateGoal(-1)}
                    disabled={goal <= 1}
                    aria-label="Diminuer l'objectif d'une candidature"
                  >
                    −
                  </button>
                  <span className="goal-target-display" aria-live="polite">{goal}</span>
                  <button
                    type="button"
                    className="goal-btn"
                    onClick={() => updateGoal(1)}
                    disabled={goal >= 50}
                    aria-label="Augmenter l'objectif d'une candidature"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div
              className="goal-progress-track"
              role="progressbar"
              aria-valuenow={clampedValueNow}
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuetext={`${sentThisWeek} sur ${goal} candidature${goal > 1 ? 's' : ''}`}
              aria-label="Progression de l'objectif hebdomadaire"
            >
              <div className="goal-progress-bar" style={{ width: `${goalProgress}%` }} />
            </div>
          </div>

          <p className="local-disclaimer">
            Cible mémorisée dans ce navigateur (hors base de données SQLite).
          </p>
        </article>

        {/* Panel 2: Funnel de Statuts Actuels */}
        <article className="extra-panel funnel-panel" aria-label="Entonnoir de conversion">
          <div className="extra-header">
            <div>
              <h3>Entonnoir des opportunités</h3>
              <p className="extra-subtitle">Statuts actuels, pas un historique de conversions</p>
            </div>
            <span className="extra-badge">
              {funnel[0].count} démarche{funnel[0].count > 1 ? 's' : ''}
            </span>
          </div>

          <div
            className="funnel-list"
            role="img"
            aria-label={funnel.map((step) => `${step.label} : ${step.count} (${step.rate}%)`).join(', ')}
          >
            {funnel.map((step) => (
              <div className={`funnel-stage ${step.statusClass}`} key={step.id}>
                <div className="funnel-stage-meta">
                  <span className="funnel-stage-label">{step.label}</span>
                  <span className="funnel-stage-numbers">
                    {step.count} <small>({step.rate}%)</small>
                  </span>
                </div>
                <div className="funnel-track">
                  <div
                    className="funnel-fill"
                    style={{ width: `${step.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="local-disclaimer">
            Basé sur l'état instantané des candidatures {archived ? 'archivées' : 'actives'}.
          </p>
        </article>

        {/* Panel 3: Checklist Préparation Entretien */}
        <article className="extra-panel checklist-panel" aria-label="Checklist de préparation d'entretien">
          <div className="extra-header">
            <div>
              <h3>Préparation d’entretien</h3>
              <p className="extra-subtitle">Repères méthodologiques généraux pour vos échanges</p>
            </div>
            <span className="extra-badge">
              {checkedIds.size} / {DEFAULT_CHECKLIST.length} prêt{checkedIds.size > 1 ? 's' : ''}
            </span>
          </div>

          <div className="checklist-container">
            {DEFAULT_CHECKLIST.map((item) => {
              const isDone = checkedIds.has(item.id);
              return (
                <label
                  key={item.id}
                  className={`checklist-item ${isDone ? 'is-done' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span className="checklist-text">{item.text}</span>
                </label>
              );
            })}

            <div className="checklist-actions">
              <button
                type="button"
                className="checklist-reset-btn"
                onClick={resetChecklist}
                disabled={checkedIds.size === 0}
              >
                Tout réinitialiser
              </button>
            </div>
          </div>

          <p className="local-disclaimer">
            Repères généraux mémorisés dans ce navigateur (non liés à une candidature unique, hors SQLite).
          </p>
        </article>

        {/* Panel 4: Canaux d'offres (Domaines extraits des URLs) */}
        <article className="extra-panel channels-panel" aria-label="Canaux d'offres principaux">
          <div className="extra-header">
            <div>
              <h3>Canaux & Domaines d’offres</h3>
              <p className="extra-subtitle">
                {allDomains.length > 5
                  ? `Top 5 sur ${allDomains.length} domaines d’offres`
                  : 'Sources extraites des liens d’offres HTTP(S)'}
              </p>
            </div>
            <span className="extra-badge">
              {totalLinked} avec lien
            </span>
          </div>

          <div className="domains-container">
            {topDomains.length === 0 ? (
              <p className="domains-empty">
                Aucun lien d’offre HTTP(S) renseigné. Ajoutez des URLs à vos candidatures pour voir vos sources clés (LinkedIn, WTTJ, etc.).
              </p>
            ) : (
              topDomains.map(({ domain, count }) => (
                <div className="domain-row" key={domain}>
                  <span className="domain-name" title={domain}>{domain}</span>
                  <span className="domain-count-badge">
                    {count} offre{count > 1 ? 's' : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="local-disclaimer">
            Extraction temps réel des domaines web HTTP(S) sans ajout de champ déclaratif.
          </p>
        </article>
      </div>
    </section>
  );
}
