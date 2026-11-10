export const STATUSES = [
  'À postuler',
  'Candidature envoyée',
  'Entretien prévu',
  'Offre reçue',
  'Refusé',
];

export const EMPTY_APPLICATION = {
  company: '', position: '', url: '', location: '', appliedAt: '',
  status: STATUSES[0], salary: '', contact: '', notes: '', followUpAt: '',
};

// Compare calendar days, not elapsed hours: daylight-saving changes must not shift reminders.
export function followUpLabel(date, now = new Date()) {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  if (days > 1) return `Dans ${days} jours`;
  return `En retard de ${-days} jour${days < -1 ? 's' : ''}`;
}

export function statistics(applications) {
  const sent = applications.filter((item) => item.status !== STATUSES[0]);
  const responses = sent.filter((item) => [STATUSES[2], STATUSES[3], STATUSES[4]].includes(item.status));
  return {
    total: applications.length,
    responseRate: sent.length ? Math.round(responses.length / sent.length * 100) : 0,
    interviews: applications.filter((item) => item.status === STATUSES[2]).length,
    rejected: applications.filter((item) => item.status === STATUSES[4]).length,
  };
}

export function filterApplications(applications, { query = '', status = '', sort = 'desc' } = {}) {
  const search = query.trim().toLocaleLowerCase('fr');
  return applications.filter((item) =>
    (!status || item.status === status) &&
    `${item.company} ${item.position}`.toLocaleLowerCase('fr').includes(search)
  ).sort((a, b) => {
    // Undated applications always appear last.
    if (!a.appliedAt && b.appliedAt) return 1;
    if (a.appliedAt && !b.appliedAt) return -1;
    return (sort === 'asc' ? 1 : -1) * (a.appliedAt || '').localeCompare(b.appliedAt || '') || b.id - a.id;
  });
}
