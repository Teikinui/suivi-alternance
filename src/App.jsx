import React, { useEffect, useRef, useState } from 'react';
import { EMPTY_APPLICATION, STATUSES, filterApplications, followUpLabel, statistics } from '../shared/domain.js';
import Charts from './Charts.jsx';

const dateLabel = (date) => date ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Date non renseignée';
const today = () => new Date().toLocaleDateString('sv-SE');
const statusClass = (status) => `status-${STATUSES.indexOf(status)}`;

async function api(path = '', options = {}) {
  const response = await fetch(`/api/applications${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Impossible de contacter le serveur. Réessayez.');
  }
  return response.status === 204 ? null : response.json();
}

function ApplicationForm({ application, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const initial = Object.fromEntries(Object.keys(EMPTY_APPLICATION).map((key) => [key, application?.[key] ?? EMPTY_APPLICATION[key]]));
    if (!application) initial.appliedAt = today();
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); } catch (err) { setError(err.message); setSaving(false); }
  }
  return <dialog ref={dialog} className="editor" aria-labelledby="form-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={submit}>
      <div className="dialog-heading"><div><p className="eyebrow">UN NOUVEAU CHAPITRE</p><h2 id="form-title">{application ? 'Modifier la candidature' : 'Nouvelle candidature'}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="Fermer">×</button></div>
      <p className="muted text-sm mb-5">Les champs marqués d’un * sont obligatoires.</p>
      <fieldset className="form-section"><legend>L’opportunité</legend><div className="form-grid">
        <label>Entreprise *<input autoFocus required name="company" maxLength={160} value={form.company} onChange={change} placeholder="Ex. Studio Horizon" /></label>
        <label>Poste *<input required name="position" maxLength={160} value={form.position} onChange={change} placeholder="Ex. Développeur·se full-stack" /></label>
        <label className="full">Lien de l’offre<input type="url" name="url" maxLength={2048} value={form.url} onChange={change} placeholder="https://…" /></label>
        <label>Lieu / télétravail<input name="location" maxLength={200} value={form.location} onChange={change} placeholder="Paris · Hybride" /></label>
        <label>Salaire<input name="salary" maxLength={120} value={form.salary} onChange={change} placeholder="40–45 k€ / an" /></label>
      </div></fieldset>
      <fieldset className="form-section"><legend>Le suivi</legend><div className="form-grid">
        <label>Statut<select name="status" value={form.status} onChange={change}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Date de candidature<input type="date" name="appliedAt" value={form.appliedAt} onChange={change} /></label>
        <label>Contact<input name="contact" maxLength={300} value={form.contact} onChange={change} placeholder="Nom, e-mail ou téléphone" /></label>
        <label>Prochaine relance<input type="date" name="followUpAt" value={form.followUpAt} onChange={change} /></label>
        <div className="full"><label htmlFor="application-notes">Notes</label><textarea id="application-notes" className="mt-2" name="notes" rows={4} maxLength={10000} aria-describedby="notes-count" value={form.notes} onChange={change} placeholder="Échanges, préparation d’entretien, prochaines étapes…" /></div>
        <p id="notes-count" className="notes-count full">{form.notes.length} / 10 000 caractères</p>
      </div></fieldset>
      {error && <p role="alert" className="error mt-4">{error}</p>}
      <div className="dialog-footer"><button type="button" className="button secondary" disabled={saving} onClick={onClose}>Annuler</button><button className="button primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  </dialog>;
}

function Reminder({ date }) {
  return <p className={`reminder ${date <= today() ? 'due' : ''}`}><span>◷ Relance · {followUpLabel(date)}</span><span className="reminder-date">{dateLabel(date)}</span></p>;
}

function Card({ item, onEdit, onArchive, onDelete, onStatus, busy }) {
  return <article className="application-card">
    <div className="flex items-center justify-between gap-2"><span className="company-avatar" aria-hidden="true">{item.company.slice(0, 2).toUpperCase()}</span>{item.url && <a className="offer-link" href={item.url} target="_blank" rel="noopener noreferrer">Voir l’offre ↗</a>}</div>
    <h3>{item.company}</h3><p className="position">{item.position}</p>
    {item.location && <p className="card-detail">⌖ {item.location}</p>}
    {item.salary && <p className="card-detail">{item.salary}</p>}
    <p className="card-date">{dateLabel(item.appliedAt)}</p>
    {item.followUpAt && <Reminder date={item.followUpAt} />}
    {item.contact && <p className="card-detail">Contact : {item.contact}</p>}
    {item.notes && <p className="card-notes">{item.notes}</p>}
    <label className="sr-only" htmlFor={`status-${item.id}`}>Statut de {item.company} — {item.position}</label>
    <select id={`status-${item.id}`} className={`card-status ${statusClass(item.status)}`} disabled={busy} value={item.status} onChange={(event) => onStatus(item, event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
    <div className="card-actions"><button disabled={busy} onClick={() => onEdit(item)}>Modifier</button><button disabled={busy} onClick={() => onArchive(item)}>{item.archived ? 'Restaurer' : 'Archiver'}</button><button disabled={busy} className="delete-button" onClick={() => onDelete(item)} aria-label={`Supprimer ${item.company} — ${item.position}`}>Supprimer</button></div>
  </article>;
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const searchInput = useRef(null);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('desc');
  const [view, setView] = useState('kanban');
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
    catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* Storage may be disabled. */ }
  }, [theme]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setApplications([]);
    setError('');
    api(`?archived=${archived}`).then((data) => { if (active) setApplications(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [archived, reload]);

  async function save(form) {
    const item = await api(editor.id ? `/${editor.id}` : '', { method: editor.id ? 'PATCH' : 'POST', body: JSON.stringify(form) });
    setApplications((items) => editor.id ? items.map((old) => old.id === item.id ? item : old) : [item, ...items]);
    setEditor(null);
    setNotice('Candidature enregistrée.');
  }
  async function mutate(item, changes) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!changes) {
        await api(`/${item.id}`, { method: 'DELETE' });
        setApplications((items) => items.filter((old) => old.id !== item.id));
        setNotice('Candidature supprimée.');
      } else {
        const updated = await api(`/${item.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
        setApplications((items) => updated.archived !== archived ? items.filter((old) => old.id !== item.id) : items.map((old) => old.id === item.id ? updated : old));
        setNotice('Candidature mise à jour.');
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const visible = filterApplications(applications, { query, status, sort });
  const stats = statistics(applications);
  const dueCount = applications.filter((item) => item.followUpAt && item.followUpAt <= today()).length;
  const actions = {
    onEdit: setEditor,
    onArchive: (item) => mutate(item, { archived: !item.archived }),
    onDelete: (item) => { if (window.confirm(`Supprimer définitivement la candidature chez ${item.company} ? Cette action est irréversible.`)) mutate(item); },
    onStatus: (item, value) => mutate(item, { status: value }),
    busy,
  };
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Candidatures, accueil"><span className="brand-mark">c.</span><span>candidatures<span className="brand-dot">.</span></span></a><div className="flex items-center gap-4"><span className="private-label"><span /> Votre espace personnel</span><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button></div></header>
    <main>
      <section className="page-heading"><div><p className="eyebrow">VOTRE PROCHAIN CHAPITRE COMMENCE ICI</p><h1>Chaque candidature,<br className="mobile-break" /> une nouvelle possibilité<span className="brand-dot">.</span></h1><p className="muted">Un peu d’organisation. Beaucoup de perspectives.</p></div><button className="button primary new-button" disabled={archived || loading || busy} onClick={() => setEditor({})}><span aria-hidden="true">＋</span> Nouvelle candidature</button></section>
      <section className="stats-grid" aria-label={archived ? 'Statistiques des archives' : 'Statistiques des candidatures actives'}>
        {[[stats.total, 'Candidatures', '↗', 'Toutes vos opportunités'], [`${stats.responseRate}%`, 'Taux de réponse', '◉', 'Parmi les candidatures envoyées'], [stats.interviews, 'Entretiens prévus', '◷', 'De belles rencontres à venir'], [stats.rejected, 'Refus', '↳', 'On avance, on apprend']].map(([value, label, icon, detail], index) => <div className={`stat-card stat-${index}`} key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div><strong>{value}</strong><p>{detail}</p></div>)}
      </section>
      {!loading && <Charts applications={applications} />}
      <section className="workspace" aria-label="Suivi des candidatures">
        <div className="workspace-heading"><div className="tabs"><button className={!archived ? 'active' : ''} disabled={busy} onClick={() => setArchived(false)} aria-pressed={!archived}>Mes candidatures</button><button className={archived ? 'active' : ''} disabled={busy} onClick={() => setArchived(true)} aria-pressed={archived}>Archives</button></div><span className="muted text-sm">{dueCount > 0 ? `${dueCount} relance${dueCount > 1 ? 's' : ''} à prévoir` : 'Une étape à la fois ✨'}</span></div>
        <div className="toolbar">
          <div className="search-field"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="application-search">Rechercher une entreprise ou un poste</label><input ref={searchInput} id="application-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une entreprise, un poste…" />{query && <button type="button" className="search-clear" aria-label="Effacer la recherche" onClick={() => { setQuery(''); searchInput.current.focus(); }}>×</button>}</div>
          <label><span className="sr-only">Filtrer par statut</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="sr-only">Trier par date</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="desc">Date : plus récentes</option><option value="asc">Date : plus anciennes</option></select></label>
          <div className="view-switch" aria-label="Type de vue"><button className={view === 'kanban' ? 'active' : ''} aria-label="Vue Kanban" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>▥ <span>Kanban</span></button><button className={view === 'table' ? 'active' : ''} aria-label="Vue Tableau" aria-pressed={view === 'table'} onClick={() => setView('table')}>☷ <span>Tableau</span></button></div>
        </div>
        {error && <div className="error message" role="alert">{error} <button onClick={() => setReload((value) => value + 1)}>Réessayer</button></div>}
        <p className="sr-only" role="status">{notice}</p>
        {loading ? <div className="empty-state" role="status">Chargement de vos candidatures…</div> : <>
          <p className="results-count">{visible.length} candidature{visible.length > 1 ? 's' : ''}{archived ? ' archivée(s)' : ''}{query || status ? ' correspondante(s)' : ''}</p>
          {applications.length === 0 && !error && <div className="welcome"><span aria-hidden="true">↗</span><div><h2>{archived ? 'Vos archives sont vides' : 'Votre prochaine opportunité vous attend'}</h2><p>{archived ? 'Les candidatures archivées restent ici, prêtes à être restaurées.' : 'Ajoutez votre première candidature pour commencer à tracer votre parcours.'}</p></div>{!archived && <button className="button secondary" onClick={() => setEditor({})}>Ajouter une candidature</button>}</div>}
          {applications.length > 0 && visible.length === 0 && <div className="empty-state">Aucune candidature ne correspond à vos filtres. <button className="text-link" onClick={() => { setQuery(''); setStatus(''); }}>Réinitialiser</button></div>}
          {view === 'kanban' ? <div className="kanban">{STATUSES.filter((value) => !status || status === value).map((column) => <section className={`kanban-column ${statusClass(column)}${visible.some((item) => item.status === column) ? '' : ' is-empty'}`} key={column} aria-label={column}><div className="column-heading"><h2><span className="status-dot" />{column}</h2><span className="column-count">{visible.filter((item) => item.status === column).length}</span></div><div className="column-body">{visible.filter((item) => item.status === column).map((item) => <Card key={item.id} item={item} {...actions} />)}{!visible.some((item) => item.status === column) && <div className="column-placeholder">Les possibilités prennent forme ici</div>}</div></section>)}</div>
          : <div className="table-scroll"><table><caption className="sr-only">Liste des candidatures</caption><thead><tr><th>Entreprise / poste</th><th>Statut</th><th>Lieu / salaire</th><th>Candidature</th><th>Relance</th><th>Actions</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><button className="table-company" onClick={() => setEditor(item)}>{item.company}</button><p className="muted">{item.position}</p>{item.url && <a className="offer-link" href={item.url} target="_blank" rel="noopener noreferrer">Voir l’offre ↗</a>}</td><td><select aria-label={`Statut de ${item.company} — ${item.position}`} className={`card-status ${statusClass(item.status)}`} value={item.status} disabled={busy} onChange={(event) => actions.onStatus(item, event.target.value)}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></td><td>{item.location || '—'}<p className="muted">{item.salary}</p></td><td>{dateLabel(item.appliedAt)}</td><td>{item.followUpAt ? <Reminder date={item.followUpAt} /> : '—'}</td><td><div className="table-actions"><button disabled={busy} onClick={() => setEditor(item)}>Modifier</button><button disabled={busy} onClick={() => actions.onArchive(item)}>{archived ? 'Restaurer' : 'Archiver'}</button><button disabled={busy} className="delete-button" onClick={() => actions.onDelete(item)}>Supprimer</button></div></td></tr>)}</tbody></table></div>}
        </>}
      </section>
      <footer className="footer"><span>Fait pour avancer, à votre rythme.</span><span>Vos données restent chez vous · SQLite</span></footer>
    </main>
    {editor && <ApplicationForm application={editor.id ? editor : null} onSave={save} onClose={() => setEditor(null)} />}
  </div>;
}
