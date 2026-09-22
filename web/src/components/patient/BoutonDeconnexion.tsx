'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { aDesBrouillonsLocaux, effacerTousLesBrouillons } from '@/lib/questionnaire-draft';

// « Se déconnecter » du portail patient.
//
// Il arrive avec la session de 30 jours et n'a de sens qu'avec elle : tant que
// la session se fermait seule en 12 h, l'ordinateur familial se nettoyait tout
// seul le soir. Ce n'est plus le cas.
//
// Le composant ne DÉCIDE pas de sa visibilité — c'est le layout du portail qui
// ne le rend qu'en présence d'une session signée valide.
//
// La condition est « une session », PAS « ailleurs que sur la page de
// connexion » : un patient encore connecté qui ouvre `/portail/connexion` y voit
// donc le bouton, et c'est normal — il a bien une session à fermer. Ce qui est
// garanti est plus étroit, et suffit : une fois déconnecté, il n'y a plus de
// cookie, donc plus de bouton sur l'écran d'arrivée.
export function BoutonDeconnexion() {
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  /**
   * Premier clic. S'il reste des réponses non envoyées sur cet appareil, on
   * DEMANDE avant d'effacer ; sinon on part directement.
   *
   * Le cas courant est « pas de brouillon » : la confirmation n'apparaît donc
   * presque jamais, et quand elle apparaît c'est qu'il y a quelque chose à
   * perdre. Un dialogue systématique aurait le défaut inverse — on apprend à le
   * congédier sans lire, et l'avertissement ne protège plus rien.
   */
  function demander() {
    if (aDesBrouillonsLocaux()) {
      setEchec(false);
      setConfirmation(true);
      return;
    }
    void deconnecter();
  }

  async function deconnecter() {
    setEnCours(true);
    setEchec(false);
    setConfirmation(false);

    // ON NE REDIRIGE QUE SI LE SERVEUR A CONFIRMÉ. La première version partait
    // sans regarder la réponse : sur une erreur, le patient atterrissait sur la
    // page de connexion en gardant son cookie — il lisait « déconnecté » et
    // cessait d'essayer. C'est le pire des états, et sur un appareil partagé
    // c'est précisément celui qu'il ne faut pas produire (revue Copilot,
    // PR #1211).
    let confirme = false;
    try {
      const reponse = await fetch('/api/portail/deconnexion', { method: 'POST' });
      confirme = reponse.ok;
    } catch {
      confirme = false; // réseau coupé
    }

    if (!confirme) {
      setEnCours(false);
      setEchec(true);
      return;
    }

    // LA PURGE VIENT APRÈS LA CONFIRMATION DU SERVEUR, ET C'EST L'ORDRE QUI
    // COMPTE. Effacer d'abord ferait perdre les brouillons à qui reste connecté
    // parce que la déconnexion a échoué — on aurait détruit du travail sans
    // même rendre l'appareil sûr.
    effacerTousLesBrouillons();

    // `location.assign` et non `router.push` : on veut que le navigateur
    // reparte du serveur avec le cookie effacé, sans réutiliser le cache
    // client d'un rendu fait pendant que la session vivait encore.
    window.location.assign('/portail/connexion');
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <PatientButton
        variant="neutral"
        onClick={demander}
        loading={enCours}
        loadingLabel="Déconnexion…"
      >
        Se déconnecter
      </PatientButton>

      {/* L'avertissement dit CE QUI SERA PERDU, et propose les deux suites.
          Il ne dit pas « êtes-vous sûr ? » : une question sans contenu se
          répond au réflexe. `role="alertdialog"` + `aria-describedby` pour que
          le motif soit lu, pas seulement le titre. */}
      {confirmation && (
        <div
          role="alertdialog"
          aria-label="Réponses non envoyées"
          aria-describedby="wn-deconnexion-motif"
          className="max-w-[18rem] rounded-xl border border-border bg-surface p-3 space-y-2 text-right"
        >
          <p id="wn-deconnexion-motif" className="text-xs text-foreground">
            Des réponses commencées sur cet appareil ne sont pas encore envoyées.
            Elles seront effacées d’ici — c’est ce qui protège un ordinateur
            partagé. Vous pourrez les ressaisir à votre prochaine connexion.
          </p>
          <div className="flex justify-end gap-2">
            <PatientButton variant="neutral" onClick={() => setConfirmation(false)}>
              Annuler
            </PatientButton>
            <PatientButton variant="primary" onClick={() => void deconnecter()}>
              Se déconnecter et effacer
            </PatientButton>
          </div>
        </div>
      )}
      {/* `role="alert"` : l'échec est annoncé, pas seulement affiché — le
          bouton vient d'être actionné, le lecteur d'écran est ailleurs. */}
      {echec && (
        <p role="alert" className="text-xs text-status-danger max-w-[16rem] text-right">
          La déconnexion n’a pas abouti. Vous êtes toujours connecté — réessayez,
          ou fermez complètement le navigateur.
        </p>
      )}
    </div>
  );
}
