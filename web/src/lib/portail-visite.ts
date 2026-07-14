// Résumé "ce qui a changé depuis la dernière visite" du hub patient (HC-F
// LOT-04, Étape 6). Purement local et présentationnel : compare un
// instantané précédent (localStorage) à l'état courant pour produire des
// phrases factuelles en français — jamais un champ technique brut
// (`statutReponses`) exposé tel quel, jamais d'écriture serveur.

export type VisiteSnapshotItem = { idAssignation: string; titre: string; statutReponses: string };
export type ChangementVisite = { idAssignation: string; texte: string };

function storageKey(token: string): string {
  return `wellneuro:portail:derniere-visite:${token}`;
}

function readSnapshot(token: string): VisiteSnapshotItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VisiteSnapshotItem[]) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(token: string, snapshot: VisiteSnapshotItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(token), JSON.stringify(snapshot));
  } catch {
    /* mode privé / quota : le résumé de visite suivant sera simplement vide */
  }
}

// Compare l'instantané précédent à l'état courant, puis écrit le nouvel
// instantané pour la prochaine visite. Aucun changement détecté à la toute
// première visite (pas d'instantané précédent) — comportement voulu, pas un
// bug : il n'y a alors rien à comparer.
export function detecterChangementsEtMettreAJour(token: string, courant: VisiteSnapshotItem[]): ChangementVisite[] {
  const precedent = readSnapshot(token);
  const changements: ChangementVisite[] = [];

  if (precedent) {
    const precedentParId = new Map(precedent.map(item => [item.idAssignation, item]));
    for (const item of courant) {
      const avant = precedentParId.get(item.idAssignation);
      if (!avant) {
        changements.push({ idAssignation: item.idAssignation, texte: `Un nouveau questionnaire est disponible : « ${item.titre} ».` });
        continue;
      }
      if (avant.statutReponses === item.statutReponses) continue;
      if (item.statutReponses === 'modification_demandee') {
        changements.push({ idAssignation: item.idAssignation, texte: `Une correction a été demandée sur « ${item.titre} ».` });
      } else if (item.statutReponses === 'deverrouille') {
        changements.push({ idAssignation: item.idAssignation, texte: `« ${item.titre} » a été déverrouillé par votre praticien.` });
      }
    }
  }

  writeSnapshot(token, courant);
  return changements;
}
