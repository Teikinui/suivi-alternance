import React, { useRef, useState } from 'react';
import { contactHref, snoozeDate } from '../shared/dashboard.js';
import { followUpLabel } from '../shared/domain.js';

export default function ActionCenter({ applications, busy, onSnooze, onEdit }) {
  const [open, setOpen] = useState(true);
  const summary = useRef(null);
  async function postpone(item, days) {
    if (await onSnooze(item, { followUpAt: snoozeDate(days) })) summary.current?.focus();
  }
  return <details className="action-center" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary ref={summary}><span>À traiter aujourd’hui</span><span className="action-count">{applications.length} relance{applications.length > 1 ? 's' : ''}</span></summary>
    <div className="action-body">
      <p className="action-help">Candidatures actives, échéance aujourd’hui ou dépassée, tous statuts confondus. Les reports partent d’aujourd’hui ; recherche et filtres n’affectent pas cette liste.</p>
      {applications.length === 0 ? <p className="action-empty">Aucune relance à traiter. Vous êtes à jour !</p> : <ul className="action-list">
        {applications.map((item) => <li key={item.id}>
          <div className="action-info"><button type="button" className="action-company" aria-label={`Ouvrir ${item.company} — ${item.position}`} onClick={() => onEdit(item)} disabled={busy}>{item.company} · {item.position}</button>
            <p className="action-deadline">{followUpLabel(item.followUpAt)} · <time dateTime={item.followUpAt}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${item.followUpAt}T12:00:00`))}</time></p>
            <p className="action-contact">Contact : {item.contact ? contactHref(item.contact) ? <a href={contactHref(item.contact)}>{item.contact}</a> : <span>{item.contact}</span> : 'non renseigné — ouvrez la candidature pour le compléter'}</p>
          </div>
          <div className="action-buttons">
            {item.url && <a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Voir l’offre de ${item.company}`}>Offre ↗</a>}
            {[2, 7].map((days) => <button type="button" className="button secondary" key={days} disabled={busy} aria-label={`Reporter ${item.company} de ${days} jours à partir d’aujourd’hui`} onClick={() => postpone(item, days)}>+{days} jours</button>)}
          </div>
        </li>)}
      </ul>}
    </div>
  </details>;
}
