'use client';

import type { FileEnvoiBrouillon } from '@/app/api/praticien/file-envoi/route';
import { GesteConfirme } from '@/components/ui/GesteConfirme';

/**
 * T-68 ([[D-488]], amendement DOC-13) : la question nomme le destinataire et
 * le nombre ; un seul élément, elle nomme son titre. Accolades de D-488
 * remplacées, tout le reste mot pour mot.
 */
export function questionEnvoi(brouillon: Pick<FileEnvoiBrouillon, 'prenom' | 'nom' | 'items'>): string {
  const patient = `${brouillon.prenom} ${brouillon.nom}`.trim();
  const n = brouillon.items.length;
  if (n === 1) {
    return `Envoyer le questionnaire « ${brouillon.items[0]?.titre ?? ''} » à ${patient} ?`;
  }
  return `Envoyer ${n} questionnaires à ${patient} en un seul mail ?`;
}

/**
 * « Envoyer (N) — un seul mail », confirmé (Q3 de [[D-481]]) dans ses deux
 * entrées : la file de la Bibliothèque et celle du Fil du jour. Le clic
 * n'envoie rien ; « Confirmer l'envoi » (T-69) appelle `onEnvoyer`, qui reste
 * l'appel unique à la route d'envoi — [[D-030]] inchangée : un seul mail, un
 * seul lien portail, même déduplication.
 *
 * Sous la question, les titres des éléments de la file ; à un seul élément,
 * le titre est déjà dans la question et la liste n'est pas répétée.
 */
export function EnvoiConfirme({
  brouillon,
  libelle,
  desactive,
  classeDeclencheur,
  onEnvoyer,
}: {
  brouillon: FileEnvoiBrouillon;
  libelle: string;
  desactive: boolean;
  classeDeclencheur?: string;
  onEnvoyer: () => void;
}) {
  return (
    <GesteConfirme
      libelle={libelle}
      classeDeclencheur={classeDeclencheur}
      question={questionEnvoi(brouillon)}
      libelleConfirmer="Confirmer l'envoi"
      desactive={desactive}
      onConfirmer={onEnvoyer}
    >
      {brouillon.items.length > 1 && (
        <ul className="mt-2 flex flex-col gap-0.5 text-xs text-foreground">
          {brouillon.items.map(item => (
            <li key={item.id}>{item.titre}</li>
          ))}
        </ul>
      )}
    </GesteConfirme>
  );
}
