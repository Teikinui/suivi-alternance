import React from 'react';
import { STATUSES } from '../shared/domain.js';

export function weeklyActivity(applications, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      count: applications.filter((item) => {
        if (!item.appliedAt) return false;
        const date = new Date(`${item.appliedAt}T00:00:00`);
        return date >= start && date < end && date <= now;
      }).length,
    };
  });
}

export default function Charts({ applications }) {
  const weeks = weeklyActivity(applications);
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const points = weeks.map((week, index) => `${35 + index * 60},${125 - week.count / max * 95}`).join(' ');
  const total = applications.length;
  return <section className="charts-grid" aria-label="Graphiques des candidatures">
    <article className="chart-panel"><div className="chart-heading"><div><h2>Le rythme de vos candidatures</h2><p>Votre activité sur les 8 dernières semaines</p></div><span className="chart-tag">{weeks.reduce((sum, week) => sum + week.count, 0)} envois</span></div>
      <svg viewBox="0 0 490 165" role="img" aria-labelledby="activity-title" aria-describedby="activity-description" className="activity-chart"><title id="activity-title">Candidatures par semaine</title><desc id="activity-description">{weeks.map((week) => `Semaine du ${week.label} : ${week.count}`).join('. ')}</desc>
        {[30, 77.5, 125].map((y, index) => <g key={y}><line x1="35" x2="455" y1={y} y2={y} className="chart-gridline" /><text x="8" y={y + 4} className="chart-label">{Number((max * (2 - index) / 2).toFixed(1))}</text></g>)}
        <polygon points={`35,125 ${points} 455,125`} className="chart-area" />
        <polyline points={points} className="chart-line" />
        {weeks.map((week, index) => <g key={week.label}><circle cx={35 + index * 60} cy={125 - week.count / max * 95} r="4" className="chart-point"><title>{week.label} : {week.count} candidature(s)</title></circle><text x={35 + index * 60} y="153" textAnchor="middle" className="chart-label">{week.label}</text></g>)}
      </svg>
    </article>
    <article className="chart-panel"><div className="chart-heading"><div><h2>Où en êtes-vous ?</h2><p>La répartition de vos opportunités</p></div><span className="chart-tag">{total} au total</span></div>
      <div className="distribution" role="img" aria-label={STATUSES.map((status) => `${status} : ${applications.filter((item) => item.status === status).length}`).join(', ')}>{STATUSES.map((status, index) => {
        const count = applications.filter((item) => item.status === status).length;
        const percentage = total ? Math.round(count / total * 100) : 0;
        return <div className={`distribution-row status-${index}`} key={status}><span className="distribution-label"><span className="status-dot" />{status}</span><div className="distribution-track"><div style={{ width: `${percentage}%` }} /></div><span className="distribution-number">{count} <small>· {percentage}%</small></span></div>;
      })}</div>
    </article>
  </section>;
}
