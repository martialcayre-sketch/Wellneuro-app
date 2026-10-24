'use client';

import { useEffect, useRef, useState } from 'react';

// L'AJOUT D'UN QUESTIONNAIRE À LA FILE D'ENVOI, depuis une proposition du
// cockpit : la re-passation ciblée de la Trajectoire (LOT-07, `D-058`) et
// « Compléter la mesure » des 12 besoins ([[D-352]] §2). Un seul appel, un seul
// bouton, un seul jeu de libellés : un troisième chemin vers la file finirait
// par en dire autre chose. Le geste POSE l'instrument dans la file ; rien ne
// part au patient d'ici — l'envoi reste le geste praticien de la Bibliothèque.

export const PHRASE_AJOUT_SANS_ENVOI =
  'L’ajout pose l’instrument dans la file d’envoi ; rien n’est envoyé au patient depuis cet écran.';

type EtatAjout = 'en_cours' | 'ajoute' | 'erreur';

export function useAjoutFileEnvoi(emailPatient: string | undefined) {
  const [ajouts, setAjouts] = useState<Record<string, EtatAjout>>({});
  const [erreursAjout, setErreursAjout] = useState<Record<string, string>>({});
  // L'état vaut pour UN patient : un composant resté monté d'un dossier A à
  // un dossier B ne doit pas dire « Dans la file d'envoi » pour B, ni y
  // afficher le refus de A. Une réponse arrivée après le changement est
  // ignorée pour la même raison.
  const [pour, setPour] = useState(emailPatient);
  const courant = useRef(emailPatient);
  useEffect(() => {
    courant.current = emailPatient;
  }, [emailPatient]);
  if (pour !== emailPatient) {
    setPour(emailPatient);
    setAjouts({});
    setErreursAjout({});
  }
  const ajouterALaFile = async (qid: string) => {
    if (!emailPatient) return;
    const destinataire = emailPatient;
    const toujoursLui = () => courant.current === destinataire;
    setAjouts(prev => ({ ...prev, [qid]: 'en_cours' }));
    setErreursAjout(prev => {
      const { [qid]: _retiree, ...reste } = prev;
      return reste;
    });
    try {
      const response = await fetch('/api/praticien/file-envoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailPatient, qids: [qid] }),
      });
      // MÊME contrat que `OrientationPanel` : la route rend
      // `MutateFileEnvoiResponse { success, error? }` — pas `ok`. Lire `ok`
      // rendait tout ajout réussi comme un échec (revue LOT-07, B3), et le
      // motif d'un vrai refus (« Dossier clos », etc.) n'était jamais affiché.
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!toujoursLui()) return;
      if (response.ok && payload.success) {
        setAjouts(prev => ({ ...prev, [qid]: 'ajoute' }));
      } else {
        setAjouts(prev => ({ ...prev, [qid]: 'erreur' }));
        if (payload.error) {
          const motif = payload.error;
          setErreursAjout(prev => ({ ...prev, [qid]: motif }));
        }
      }
    } catch {
      if (!toujoursLui()) return;
      setAjouts(prev => ({ ...prev, [qid]: 'erreur' }));
    }
  };
  return { ajouts, erreursAjout, ajouterALaFile };
}

/** Le bouton (ou son état « Dans la file d'envoi ») d'un questionnaire. */
export function BoutonAjoutFileEnvoi({
  qid,
  etat,
  onAjouter,
}: {
  qid: string;
  etat: EtatAjout | undefined;
  onAjouter: (qid: string) => void;
}) {
  if (etat === 'ajoute') return <span className="text-muted-foreground">Dans la file d’envoi</span>;
  return (
    <button
      type="button"
      onClick={() => onAjouter(qid)}
      disabled={etat === 'en_cours'}
      className="min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
    >
      {etat === 'erreur' ? 'Réessayer l’ajout' : 'Ajouter à la file d’envoi'}
    </button>
  );
}

/** Le motif d'un refus, sous le bouton : il vient de la route (« Dossier
 *  clos. », …) — un échec muet ferait recliquer sans comprendre. */
export function ErreurAjoutFileEnvoi({ etat, erreur }: { etat: EtatAjout | undefined; erreur: string | undefined }) {
  if (etat !== 'erreur') return null;
  return (
    <p role="status" className="mt-1 text-xs text-status-warning">
      {erreur ?? 'L’ajout à la file d’envoi a échoué. Réessayez.'}
    </p>
  );
}
