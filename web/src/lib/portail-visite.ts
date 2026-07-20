// Résumé "ce qui a changé depuis la dernière visite" du hub patient (HC-F
// LOT-04, Étape 6). Purement local et présentationnel : compare un
// instantané précédent (localStorage) à l'état courant pour produire des
// phrases factuelles en français — jamais un champ technique brut
// (`statutReponses`) exposé tel quel, jamais d'écriture serveur.
//
// L'instantané est indexé par `idPatient` (identité de la session vérifiée) et
// non par le jeton de l'URL. C'est la trace locale la plus durable du portail —
// `localStorage` survit à la fermeture de l'onglet : un jeton en clé y
// laisserait un secret d'accès à demeure, et « depuis la dernière visite »
// repartirait de zéro à chaque changement de lien (gate G4), c'est-à-dire
// précisément quand la reprise à plusieurs mois en aurait le plus besoin.

export type VisiteSnapshotItem = { idAssignation: string; titre: string; statutReponses: string };
export type ChangementVisite = { idAssignation: string; texte: string };

function storageKey(idPatient: string): string {
  return `wellneuro:portail:derniere-visite:${idPatient}`;
}

function readSnapshot(idPatient: string): VisiteSnapshotItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(idPatient));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VisiteSnapshotItem[]) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(idPatient: string, snapshot: VisiteSnapshotItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(idPatient), JSON.stringify(snapshot));
  } catch {
    /* mode privé / quota : le résumé de visite suivant sera simplement vide */
  }
}

// Compare l'instantané précédent à l'état courant, puis écrit le nouvel
// instantané pour la prochaine visite. Aucun changement détecté à la toute
// première visite (pas d'instantané précédent) — comportement voulu, pas un
// bug : il n'y a alors rien à comparer.
export function detecterChangementsEtMettreAJour(idPatient: string, courant: VisiteSnapshotItem[]): ChangementVisite[] {
  // Sans identité, on ne compare ni n'écrit : un instantané dans un
  // compartiment commun mélangerait les visites de deux patients d'un même
  // appareil, et annoncerait à l'un les questionnaires de l'autre.
  if (!idPatient) return [];
  const precedent = readSnapshot(idPatient);
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

  writeSnapshot(idPatient, courant);
  return changements;
}
