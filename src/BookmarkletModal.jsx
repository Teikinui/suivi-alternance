import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateBookmarkletCode } from '../shared/job-extractors/index.js';

export default function BookmarkletModal({ onClose }) {
  const dialog = useRef(null);
  const bookmark = useRef(null);
  const codeField = useRef(null);
  const [origin, setOrigin] = useState(() => window.location.origin);
  const [message, setMessage] = useState('');
  const { code, error } = useMemo(() => {
    try { return { code: generateBookmarkletCode(origin), error: '' }; }
    catch (err) { return { code: '', error: err.message }; }
  }, [origin]);
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    // React deliberately blocks javascript: JSX hrefs. This one is generated exclusively
    // from our reviewed extractors and a validated origin; it is for dragging, never clicking here.
    bookmark.current?.setAttribute('href', code || '#');
  }, [code]);
  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setMessage('Code copié. Collez-le dans l’adresse d’un nouveau favori.'); }
    catch { setMessage('Copie automatique indisponible. Ouvrez l’installation manuelle puis sélectionnez et copiez le code.'); }
  }
  return <dialog ref={dialog} className="editor bookmarklet-dialog" aria-labelledby="bookmarklet-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="dialog-heading"><div><p className="eyebrow">CAPTURE D’UNE OFFRE OUVERTE</p><h2 id="bookmarklet-title">Installer le bookmarklet</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer le guide">×</button></div>
    <p className="bookmarklet-intro">Un favori qui lit l’offre dans l’onglet ouvert et prépare une candidature « À postuler ». Rien n’est enregistré avant votre confirmation et rien n’est envoyé au recruteur.</p>
    <div className="bookmarklet-step">
      <label htmlFor="bookmarklet-origin">Adresse de votre application</label>
      <input id="bookmarklet-origin" type="url" value={origin} onChange={(event) => { setOrigin(event.target.value); setMessage(''); }} aria-describedby="bookmarklet-origin-help" aria-invalid={Boolean(error)} />
      <p id="bookmarklet-origin-help">Origine HTTP(S) uniquement, par exemple http://localhost:3000. Vérifiez cette destination avant d’installer le favori ; gardez l’application démarrée.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    <section className="bookmarklet-step" aria-labelledby="bookmarklet-install">
      <h3 id="bookmarklet-install">1. Installez votre favori</h3>
      <p>Affichez la barre de favoris (Ctrl/Cmd + Maj + B sur Chrome/Firefox), puis glissez ce lien dans la barre :</p>
      <div className="bookmarklet-drag-area"><a ref={bookmark} className="button primary bookmarklet-badge" draggable={Boolean(code)} aria-disabled={!code} onClick={(event) => { event.preventDefault(); setMessage('Glissez le lien dans la barre de favoris ou utilisez l’installation manuelle ci-dessous.'); }} title="À glisser dans la barre de favoris">＋ Suivre l’offre</a><button type="button" className="button secondary" disabled={!code} onClick={copyCode}>Copier le code</button></div>
      <details className="bookmarklet-manual"><summary>Installation manuelle et code</summary><p>Créez un favori « Suivre l’offre », puis remplacez son adresse par le code complet ci-dessous. Certains navigateurs retirent le préfixe : vérifiez que l’adresse commence bien par <code>javascript:</code>.</p><label htmlFor="bookmarklet-code">Code du bookmarklet</label><textarea id="bookmarklet-code" ref={codeField} readOnly value={code} rows={4} spellCheck={false} /><button type="button" className="button secondary" disabled={!code} onClick={() => { codeField.current.focus(); codeField.current.select(); }}>Sélectionner le code</button></details>
    </section>
    <section className="bookmarklet-step" aria-labelledby="bookmarklet-use"><h3 id="bookmarklet-use">2. Capturez et vérifiez une offre</h3><ol><li>Ouvrez la page détaillée d’une offre HTTP(S), puis cliquez sur votre favori.</li><li>L’application s’ouvre dans un nouvel onglet avec un formulaire modifiable, pas une candidature enregistrée.</li><li>Vérifiez entreprise, poste, lien, lieu et salaire ; complétez les champs manquants, puis choisissez Enregistrer ou Annuler.</li></ol></section>
    <p className="bookmarklet-limit">Extraction au mieux : Schema.org JobPosting, LinkedIn, puis métadonnées génériques. Les sites peuvent bloquer les bookmarklets (CSP), les fenêtres ou masquer les données ; autorisez les pop-ups si nécessaire, sinon utilisez la saisie manuelle. Aucun contournement de connexion, aucune requête de scraping serveur. Installation surtout adaptée aux navigateurs desktop ; l’extension est reportée.</p>
    <p className="bookmarklet-feedback" role="status">{message}</p>
    <div className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Terminer</button></div>
  </dialog>;
}
