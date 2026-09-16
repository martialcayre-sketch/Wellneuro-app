'use client';

import { useState } from 'react';
import type { PatchPatientResponse } from '@/app/api/praticien/patients/route';
import type {
  CycleDeVieAction,
  CycleDeVieResponse,
} from '@/app/api/praticien/patients/cycle-de-vie/route';
import type { CreateConsultationResponse } from '@/app/api/praticien/consultations/route';
import type { TokenActionResponse } from '@/app/api/praticien/token/route';
import { erreurLisible } from '@/lib/praticien/messagesDossier';
import type { ActionDossier, PatientRowData } from '@/components/ui/PatientRow';
import type { ModeConfirmation } from '@/components/ui/DossierConfirmDialog';

/**
 * LES GESTES IRRÉVERSIBLES DU DOSSIER, ÉCRITS UNE SEULE FOIS (LOT-06).
 *
 * POURQUOI UN HOOK PLUTÔT QU'UNE RECOPIE. Le rayon Patients et le cockpit
 * patient offrent désormais les mêmes neuf actions — dont la révocation d'accès
 * et l'EFFACEMENT DÉFINITIF. Deux implémentations auraient dérivé : une
 * confirmation ajoutée d'un côté, absente de l'autre ; un refus rendu dans le
 * dialogue ici, derrière l'overlay là-bas. Sur des gestes qui coupent l'accès
 * d'un patient ou détruisent son dossier, la dérive n'est pas une dette de
 * style — c'est la promesse faite au praticien qui cesse d'être tenue selon
 * l'écran d'où il a cliqué.
 *
 * CE QUE LE HOOK NE DÉCIDE PAS : ce qui se passe APRÈS. `apresSucces` est
 * fourni par l'appelant — le rayon rafraîchit sa table, le cockpit recharge son
 * dossier. Et `reprendreConsultation` n'existe que pour le rayon : lui seul
 * porte un tiroir « Nouvelle consultation » qu'un rétablissement d'accès peut
 * avoir interrompu.
 */

export type RetourGeste = { ok: boolean; msg: string };

export type EtatConfirmation = {
  mode: ModeConfirmation;
  patient: PatientRowData;
  suite?: 'resend' | 'consultation';
};

/**
 * `success: true` ne dit que l'écriture en base ; c'est `envoi` qui dit si
 * l'e-mail est parti. `undefined` vaut « envoyé » — les routes posent toujours
 * le champ sur un chemin d'envoi, et son absence ne doit rougir ni un envoi
 * réussi ni une action qui n'envoie rien.
 *
 * Le type vient du DTO de route, jamais de `lib/consultation/email` : ce
 * module-là importe `nodemailer`, et un import de valeur l'embarquerait au
 * bundle client.
 */
function libelleEnvoi(
  envoi: CreateConsultationResponse['envoi'],
  textes: { envoye: string; echoue: string; nonConfigure: string },
): string {
  return envoi === 'echoue'
    ? textes.echoue
    : envoi === 'non_configure'
      ? textes.nonConfigure
      : textes.envoye;
}

/** Vrai tant qu'aucun envoi n'est mort : sert la COULEUR de la ligne de statut. */
function envoiReussi(envoi: CreateConsultationResponse['envoi']): boolean {
  return envoi !== 'echoue' && envoi !== 'non_configure';
}

export function usePatientGestesDossier({
  apresSucces,
  reprendreConsultation,
}: {
  /** Rafraîchit la surface après un geste réussi. Sa valeur de retour n'est
   *  pas lue : le rayon rend deux chargements en parallèle, le cockpit un. */
  apresSucces: () => unknown;
  /** Rayon seulement : la consultation qu'un rétablissement d'accès a interrompue. */
  reprendreConsultation?: (retablirAcces: boolean) => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState<EtatConfirmation | null>(null);
  const [cycleEnCours, setCycleEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [tokenAction, setTokenAction] = useState<
    'resend' | 'revoke' | 'copier' | 'lien_magique' | null
  >(null);
  const [retour, setRetour] = useState<RetourGeste | null>(null);
  // LE DERNIER GESTE RÉUSSI, ET POURQUOI IL FAUT LE DIRE (constat de revue,
  // 2026-09-17). Après un EFFACEMENT, le dossier n'existe plus : la surface qui
  // se recharge ne le trouve pas, et rendait cette absence ATTENDUE comme une
  // erreur de lecture — « la fiche n'a pas pu être lue », sur un dossier que le
  // praticien vient délibérément de détruire. Une absence voulue et une lecture
  // en panne ne se disent pas de la même façon.
  const [dernierGeste, setDernierGeste] = useState<ModeConfirmation | null>(null);

  // `retablirAcces` : ce renvoi vient d'une confirmation de rétablissement — le
  // refus et le succès se rendent alors DANS le dialogue, pas derrière lui.
  const renvoyerLien = async (idPatient: string, retablirAcces = false) => {
    setTokenAction('resend');
    setRetour(null);
    if (retablirAcces) setErreurConfirmation(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          action: 'resend',
          ...(retablirAcces ? { retablirAcces: true } : {}),
        }),
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success) {
        const message = erreurLisible(json.reason, json.error);
        if (retablirAcces) setErreurConfirmation(message);
        else setRetour({ ok: false, msg: message });
        return;
      }
      setRetour({
        // Ici, pas de tiroir à refermer et l'action est répétable : un envoi
        // mort peut donc rougir franchement la ligne de statut.
        ok: envoiReussi(json.envoi),
        msg: libelleEnvoi(json.envoi, {
          // Le rétablissement est un fait de plus, et il a eu lieu même si
          // l'e-mail meurt : le dire dans les trois cas.
          envoye: retablirAcces
            ? 'Accès rétabli et lien renvoyé au patient.'
            : 'Lien d’accès renvoyé au patient.',
          echoue: retablirAcces
            ? 'Accès rétabli, mais le lien n’est pas parti : l’envoi a échoué. Réessayez.'
            : 'Le lien n’est pas parti : l’envoi de l’e-mail a échoué. Réessayez.',
          nonConfigure: retablirAcces
            ? 'Accès rétabli, mais le lien n’est pas parti : la messagerie n’est pas configurée.'
            : 'Le lien n’est pas parti : la messagerie n’est pas configurée.',
        }),
      });
      if (retablirAcces) {
        setConfirmation(null);
        await apresSucces();
      }
    } catch {
      if (retablirAcces) setErreurConfirmation('Erreur réseau. Réessayez.');
      else setRetour({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  // Lien magique (gate G4) — action de nature différente des autres, qui
  // pointent la page de connexion : celui-ci expire en 24 h et ne s'ouvre qu'une
  // fois. Le libellé le dit, pour qu'on ne le confonde pas avec « Renvoyer le lien ».
  const envoyerLienMagique = async (idPatient: string) => {
    setTokenAction('lien_magique');
    setRetour(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, action: 'lien_magique' }),
      });
      const json = (await r.json()) as TokenActionResponse;
      setRetour(
        !r.ok || !json.success
          ? { ok: false, msg: erreurLisible(json.reason, json.error) }
          : {
              ok: envoiReussi(json.envoi),
              msg: libelleEnvoi(json.envoi, {
                envoye: 'Lien à usage unique envoyé — valable 24 h.',
                echoue: 'Lien à usage unique émis, mais l’e-mail n’est pas parti. Réessayez.',
                nonConfigure:
                  'Lien à usage unique émis, mais aucun e-mail n’est parti : la messagerie n’est pas configurée.',
              }),
            },
      );
    } catch {
      setRetour({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  const copierLien = async (idPatient: string) => {
    setTokenAction('copier');
    setRetour(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, action: 'lien' }),
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success || !json.lien) {
        setRetour({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      await navigator.clipboard.writeText(json.lien);
      setRetour({ ok: true, msg: 'Lien copié dans le presse-papiers.' });
    } catch {
      setRetour({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  // Appelée UNIQUEMENT derrière la confirmation (LOT-02c) : un échec part donc
  // dans `erreurConfirmation`, à l'intérieur du dialogue. Rendu ailleurs dans la
  // page, il serait derrière l'overlay Radix et sous `aria-hidden`.
  const revoquerAcces = async (idPatient: string) => {
    setTokenAction('revoke');
    setErreurConfirmation(null);
    setRetour(null);
    try {
      const r = await fetch(`/api/praticien/token?idPatient=${encodeURIComponent(idPatient)}`, {
        method: 'DELETE',
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success) {
        setErreurConfirmation(erreurLisible(json.reason, json.error));
        return;
      }
      setRetour({
        ok: true,
        msg: 'Accès révoqué : lien coupé, session en cours terminée, liens à usage unique annulés.',
      });
      setConfirmation(null);
      await apresSucces();
    } catch {
      setErreurConfirmation('Erreur réseau. Réessayez.');
    } finally {
      setTokenAction(null);
    }
  };

  // Activation / désactivation par PATCH, dans les deux sens. Il n'y a plus de
  // route DELETE : elle ne savait que désactiver, et son nom laissait croire à
  // une suppression.
  const basculerActif = async (idPatient: string, actif: 'OUI' | 'NON') => {
    setErreurConfirmation(null);
    const r = await fetch('/api/praticien/patients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idPatient, actif }),
    });
    const json = (await r.json()) as PatchPatientResponse;
    if (!r.ok || !json.success) {
      setErreurConfirmation(erreurLisible(json.reason, json.error));
      return;
    }
    setRetour({
      ok: true,
      msg:
        actif === 'OUI'
          ? 'Dossier réactivé.'
          : 'Dossier désactivé : l’accès au portail est coupé.',
    });
    setConfirmation(null);
    await apresSucces();
  };

  // Le mode est typé `CycleDeVieAction` — l'union de la ROUTE — et non
  // `ModeConfirmation`, qui couvre aussi `desactivation`/`reactivation`. Ces
  // deux-là passent par `PATCH` : les accepter ici les aurait laissées typées
  // jusqu'à un 400 à l'exécution.
  const cycleDeVie = async (idPatient: string, mode: CycleDeVieAction, saisie: string) => {
    // `confirmation` est le binding de CETTE fermeture de rendu : ni
    // `setConfirmation(null)` ni `apresSucces()` ne le réassignent — ils
    // programment un rendu, qui produira une autre fermeture.
    const confirmationEnCours = confirmation;
    const r = await fetch('/api/praticien/patients/cycle-de-vie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idPatient,
        action: mode,
        // La saisie RÉELLE de l'utilisateur, jamais une constante recopiée : si
        // un jour l'activation du bouton régressait, le serveur refuserait
        // encore. Une constante en dur ferait de cette régression un effacement.
        ...(mode === 'effacement' ? { confirmation: saisie } : {}),
      }),
    });
    const json = (await r.json()) as CycleDeVieResponse;
    if (!r.ok || !json.success) {
      setErreurConfirmation(
        erreurLisible(
          json.success === false ? json.reason : undefined,
          json.success === false ? json.error : undefined,
        ),
      );
      return;
    }
    // Le message de clôture suit la MÊME condition que le dialogue qui vient de
    // le précéder (`accesActif`) : sur un dossier désactivé, le portail refuse
    // déjà le lien, et le lui promettre ici serait faux.
    const accesOuvert = confirmationEnCours?.patient.actif === 'OUI';
    setRetour({
      ok: true,
      msg:
        mode === 'effacement'
          ? 'Dossier effacé définitivement. Il ne subsiste qu’une ligne anonyme.'
          : mode === 'cloture'
            ? accesOuvert
              ? 'Suivi clôturé : plus aucune assignation ni aucun envoi de document de suivi. Le patient garde l’accès à ses archives, et vous pouvez lui renvoyer son lien.'
              : 'Suivi clôturé : plus aucune assignation ni aucun envoi de document de suivi. Le dossier reste désactivé, donc sans accès au portail.'
            : 'Suivi rouvert.',
    });
    setConfirmation(null);
    setDernierGeste(mode === 'effacement' ? 'effacement' : mode === 'cloture' ? 'cloture' : 'reprise');
    await apresSucces();
  };

  /** Exécute l'action confirmée, quelle qu'elle soit, avec un seul garde. */
  const confirmer = async (saisie: string) => {
    if (!confirmation || cycleEnCours) return;
    const { mode, patient, suite } = confirmation;
    setCycleEnCours(true);
    setErreurConfirmation(null);
    try {
      if (mode === 'desactivation') await basculerActif(patient.idPatient, 'NON');
      else if (mode === 'reactivation') await basculerActif(patient.idPatient, 'OUI');
      else if (mode === 'revocation') await revoquerAcces(patient.idPatient);
      // Ce mode ne porte pas de geste à lui : il REPREND celui qu'il a
      // interrompu. La branche est aussi ce qui garde le `else` final, typé
      // `CycleDeVieAction` : sans elle, TypeScript refuse d'y laisser passer
      // `retablissement` — et c'est voulu, la prochaine addition à
      // `ModeConfirmation` butera ici plutôt qu'en 400 à l'exécution.
      else if (mode === 'retablissement') {
        // SUR UNE SURFACE SANS TIROIR CONSULTATION, il n'y a rien à reprendre :
        // le cockpit ne fournit pas `reprendreConsultation`, et un
        // rétablissement y renvoie simplement le lien. Sans ce repli, le geste
        // se serait terminé en silence — accès rétabli, aucun lien envoyé.
        await (suite === 'consultation' && reprendreConsultation
          ? reprendreConsultation(true)
          : renvoyerLien(patient.idPatient, true));
      } else await cycleDeVie(patient.idPatient, mode, saisie);
    } catch {
      setErreurConfirmation('Erreur réseau. Réessayez.');
    } finally {
      setCycleEnCours(false);
    }
  };

  const demanderConfirmation = (
    mode: ModeConfirmation,
    patient: PatientRowData,
    suite?: 'resend' | 'consultation',
  ) => {
    setErreurConfirmation(null);
    setConfirmation({ mode, patient, suite });
  };

  // Un seul point d'entrée. TOUTE action qui change ce à quoi le patient a accès
  // passe par un dialogue — y compris la désactivation, qui coupe l'accès au
  // portail, et la révocation, entrée dans cette règle au LOT-02c.
  const agir = (action: ActionDossier, patient: PatientRowData) => {
    switch (action) {
      // SEULE ACTION DONT LE GESTE CHANGE SELON L'ÉTAT DU DOSSIER : sur un accès
      // révoqué, « Renvoyer le lien » le RÉTABLIRAIT — d'où le dialogue. Sur un
      // dossier ouvert, rien de plus n'arrive et rien n'est demandé : une
      // confirmation systématique userait la seule qui compte.
      case 'resend':
        return patient.accesRevoque
          ? demanderConfirmation('retablissement', patient, 'resend')
          : void renvoyerLien(patient.idPatient);
      case 'copier':
        return void copierLien(patient.idPatient);
      case 'lien_magique':
        return void envoyerLienMagique(patient.idPatient);
      case 'revoke':
        return demanderConfirmation('revocation', patient);
      case 'desactiver':
        return demanderConfirmation('desactivation', patient);
      case 'reactiver':
        return demanderConfirmation('reactivation', patient);
      case 'cloturer':
        return demanderConfirmation('cloture', patient);
      case 'rouvrir':
        return demanderConfirmation('reprise', patient);
      case 'effacer':
        return demanderConfirmation('effacement', patient);
    }
  };

  return {
    /** Le dossier en attente de confirmation, `null` si aucun dialogue n'est ouvert. */
    confirmation,
    fermerConfirmation: () => setConfirmation(null),
    demanderConfirmation,
    confirmer,
    cycleEnCours,
    erreurConfirmation,
    setErreurConfirmation,
    /** Une action d'accès est en vol : sert à griser le menu. */
    tokenAction,
    retour,
    setRetour,
    /** Le dernier geste mené à son terme — `'effacement'` change ce qu'une
     *  absence de dossier veut dire à la lecture suivante. */
    dernierGeste,
    agir,
    renvoyerLien,
  };
}
