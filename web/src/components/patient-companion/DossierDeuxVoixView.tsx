'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PortailDossierResponse } from '@/app/api/portail/dossier/route';
import {
  EVA_MAX,
  EVA_MIN,
  LONGUEUR_MAX_AMENDEMENT,
  LONGUEUR_MAX_REPONSE_JALON,
} from '@/lib/praticien/objectifNegocie';

// Le « dossier à deux voix » (Alliance 6.0-A, LOT-06) — surface PATIENT.
//
// Trois blocs, une seule écriture : le patient LIT l'objectif négocié, ce qu'il
// a déposé lui-même, et la synthèse de compréhension — et il peut RÉPONDRE à
// l'objectif : « c'est bien ça », « ce n'est pas exactement ça », ou — depuis
// le LOT-04 de 6.0-B (`D-110`) — « le dire autrement », en écrivant SA version
// dans ses mots.
//
// LE TROISIÈME VERBE N'EST PAS UN TROISIÈME BOUTON DE RÉPONSE. Les deux
// premiers se posent d'un clic ; celui-ci ouvre une saisie, montre sa borne
// AVANT que le patient bute dessus, et lui rend son texte à relire une fois
// déposé. Un texte de patient qui disparaît de l'écran après l'envoi se lit
// comme un texte perdu.
//
// LA BORNE VIENT DU MODULE, jamais d'un nombre recopié ici : une borne écrite
// deux fois se met à diverger, et c'est l'écran qui ment alors, pas le serveur
// (leçon `D-107`). `objectifNegocie.ts` est un domaine PUR — il n'importe rien,
// et l'embarquer dans le bundle patient n'entraîne aucune dépendance serveur
// (leçon du LOT-03).
//
// AUCUNE NOTE, AUCUNE ÉCHELLE, AUCUN DÉCOMPTE. Ni « 3 entrées », ni pouce, ni
// curseur d'accord. Graduer une ratification en ferait une mesure de l'accord
// entre deux personnes (`DC-19`/`DC-20`), et compter les entrées d'un patient
// transformerait sa parole en série.
//
// UNE RÉPONSE NE SE RETIRE PAS, et l'écran le dit AVANT le geste plutôt que de
// le laisser découvrir après. Changer d'avis, c'est répondre à nouveau — la
// réponse précédente reste, et c'est la dernière qui vaut.
//
// UN BLOC FERMÉ PAR DRAPEAU EST ABSENT, pas vide : la route rend `null`, et
// l'écran ne rend rien du tout. Écrire « pas encore ouvert » parlerait au
// patient de l'état d'un déploiement ; afficher un bloc vide lui ferait lire un
// silence de son praticien là où il n'y en a pas (`DC-24`).

type Assemblage = Extract<PortailDossierResponse, { objectifs: unknown }>;

type Etat =
  | { phase: 'chargement' }
  | { phase: 'erreur'; message: string }
  | { phase: 'pret'; donnees: Assemblage };

/** Date lisible en français, ou `null` — jamais comblée par autre chose. */
function dateLisible(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Ce que l'écran dit de l'état d'une réponse. `en_attente` NE DIT RIEN DU
 * PATIENT — ni « non ratifié », ni « en retard », ni « refusé » : il ne s'est
 * pas encore prononcé, et c'est tout ce qu'on en sait (`DC-24`).
 */
const LIBELLE_ETAT: Record<string, string> = {
  en_attente: 'Vous ne vous êtes pas encore prononcé sur cet objectif.',
  ratifie: 'Vous avez répondu : c’est bien ça.',
  conteste: 'Vous avez répondu : ce n’est pas exactement ça.',
  // NI « refusé », NI « en désaccord » : le patient n'a pas contredit, il a
  // proposé. Le libellé dit ce qu'il a FAIT, pas ce qu'on en conclut (`DC-24`).
  dit_autrement: 'Vous avez écrit votre version de cet objectif.',
};

export function DossierDeuxVoixView({ token }: { token: string }) {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' });
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  /** Ce qui vient d'être transmis, ou `null`. Deux gestes, deux accusés : un
   *  message unique ferait dire à un texte ce qu'on dit d'un clic. */
  const [repondu, setRepondu] = useState<'reponse' | 'version' | 'etape' | null>(null);
  /** La version dont le patient est en train d'écrire SA formulation, ou
   *  `null` — la saisie n'est jamais ouverte d'office : proposer un champ vide
   *  sous un objectif suggère qu'il manque quelque chose à y mettre. */
  const [amendeId, setAmendeId] = useState<string | null>(null);
  const [texteAmendement, setTexteAmendement] = useState('');
  /** Où le patient en est, à l'étape ouverte (LOT-05). */
  const [texteJalon, setTexteJalon] = useState('');
  /**
   * L'EVA, `null` TANT QUE LE PATIENT N'A RIEN CHOISI — et `null` est un état
   * complet, pas un « pas encore ». Initialiser à `0`, ou pré-sélectionner un
   * milieu, déposerait dans le dossier un chiffre que personne n'a donné
   * (`DC-24`).
   */
  const [evaJalon, setEvaJalon] = useState<number | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/dossier');
      // SESSION ABSENTE OU EXPIRÉE : retour au gate du portail, comme le fait
      // le hub. Afficher un message d'erreur laisserait le patient dans une
      // impasse — la page ne se rechargera jamais toute seule, et rien à
      // l'écran ne dit qu'il faut se reconnecter.
      if (res.status === 401) {
        window.location.href = `/portail/${token}`;
        return;
      }
      const data = (await res.json()) as PortailDossierResponse;
      if (res.ok && data.ok && 'objectifs' in data) {
        setEtat({ phase: 'pret', donnees: data });
      } else {
        setEtat({
          phase: 'erreur',
          message:
            (!data.ok && data.error) || 'Cette page n’a pas pu être chargée. Réessayez plus tard.',
        });
      }
    } catch {
      setEtat({ phase: 'erreur', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  }, [token]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const repondre = useCallback(
    async (idObjectif: string, sens: 'ratifie' | 'conteste') => {
      setEnvoi(true);
      setErreurEnvoi('');
      // Le succès précédent est retiré AVANT de repartir : sans cela, un refus
      // s'afficherait à côté d'un « c'est transmis » toujours à l'écran, et le
      // patient lirait les deux à la fois sans savoir lequel le concerne.
      setRepondu(null);
      try {
        const res = await fetch('/api/portail/dossier', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Le corps ne porte que la version visée et le sens. Pas
          // d'identifiant patient : la session le dit, et la route ne lirait pas
          // celui-ci de toute façon. Pas de date non plus : le geste est posé
          // maintenant, et c'est le serveur qui l'horodate.
          body: JSON.stringify({ idObjectif, sens }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (res.ok && data.ok) {
          setRepondu('reponse');
          await charger();
        } else {
          setErreurEnvoi(data.error ?? 'Votre réponse n’a pas pu être enregistrée.');
        }
      } catch {
        setErreurEnvoi('Erreur réseau. Réessayez.');
      } finally {
        setEnvoi(false);
      }
    },
    [charger],
  );

  /**
   * « LE DIRE AUTREMENT » — le troisième verbe.
   *
   * LA SAISIE N'EST VIDÉE QU'APRÈS UN SUCCÈS. Sur un refus — texte trop long,
   * version reformulée entre-temps —, le patient retrouve ses mots à l'écran et
   * peut les corriger. Les effacer avant de savoir si le serveur les a pris
   * ferait perdre un texte que personne d'autre ne peut réécrire.
   */
  const direAutrement = useCallback(
    async (idObjectif: string) => {
      setEnvoi(true);
      setErreurEnvoi('');
      setRepondu(null);
      try {
        const res = await fetch('/api/portail/dossier', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Le geste est NOMMÉ dans le corps, jamais deviné de la présence d'un
          // champ : le serveur refuse un geste qu'il ne connaît pas plutôt que
          // de replier sur la ratification.
          body: JSON.stringify({ geste: 'amendement', idObjectif, texte: texteAmendement }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (res.ok && data.ok) {
          setRepondu('version');
          setAmendeId(null);
          setTexteAmendement('');
          await charger();
        } else {
          setErreurEnvoi(data.error ?? 'Votre texte n’a pas pu être enregistré.');
        }
      } catch {
        setErreurEnvoi('Erreur réseau. Réessayez.');
      } finally {
        setEnvoi(false);
      }
    },
    [charger, texteAmendement],
  );

  /**
   * « OÙ J'EN SUIS » — la réponse d'étape (LOT-05, `D-111`).
   *
   * Même patron que le troisième verbe : la saisie n'est vidée qu'APRÈS un
   * succès. Un refus — fenêtre refermée entre l'affichage et l'envoi, version
   * reformulée entre-temps — rend au patient ses mots ET son EVA, tels qu'il
   * les avait posés.
   *
   * LE JALON N'EST PAS CHOISI ICI : il vient du serveur (`jalonDu`), qui seul
   * connaît l'ancre et les fenêtres. L'écran le transmet tel qu'il l'a reçu ;
   * s'il a vieilli, le serveur refuse — c'est lui qui tranche, pas l'horloge du
   * navigateur.
   */
  const direOuJenSuis = useCallback(
    async (idObjectif: string, jalon: string) => {
      setEnvoi(true);
      setErreurEnvoi('');
      setRepondu(null);
      try {
        const res = await fetch('/api/portail/dossier', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            geste: 'reponse_jalon',
            idObjectif,
            jalon,
            texte: texteJalon,
            // `null` EXPLICITE, jamais `0` ni champ omis-par-hasard : le
            // serveur distingue l'absence du refus, et l'écran doit lui dire
            // « pas de valeur » plutôt que le laisser deviner.
            eva: evaJalon,
          }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (res.ok && data.ok) {
          setRepondu('etape');
          setTexteJalon('');
          setEvaJalon(null);
          await charger();
        } else {
          setErreurEnvoi(data.error ?? 'Votre réponse n’a pas pu être enregistrée.');
        }
      } catch {
        setErreurEnvoi('Erreur réseau. Réessayez.');
      } finally {
        setEnvoi(false);
      }
    },
    [charger, evaJalon, texteJalon],
  );

  if (etat.phase === 'chargement') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Mon dossier, à deux voix" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PatientCard>
    );
  }

  if (etat.phase === 'erreur') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Mon dossier, à deux voix" />
        <PatientInlineMessage tone="error">{etat.message}</PatientInlineMessage>
      </PatientCard>
    );
  }

  const { objectifs, ratifiable, amendements, reponsesJalon, jalonDu, ceQuiCompte, comprehension } =
    etat.donnees;

  return (
    <div className="space-y-4">
      <PatientCard className="space-y-5">
        <PatientPageHeader
          title="Mon dossier, à deux voix"
          subtitle="Ce que vous avez dit, ce que votre praticien en a compris, et ce que vous en pensez. Rien ici n’est une note."
        />

        {/* ── L'OBJECTIF NÉGOCIÉ ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce sur quoi nous travaillons
          </h2>

          {objectifs.length === 0 ? (
            <PatientInlineMessage tone="info">
              Aucun objectif n’a encore été écrit avec votre praticien. Cela ne veut rien dire de
              plus : c’est une page qui n’a pas encore été remplie.
            </PatientInlineMessage>
          ) : (
            <>
              {/* DEUX VERSIONS COEXISTANTES : on les MONTRE toutes les deux et on
                  le dit, au lieu de choisir la plus récente en silence. Une
                  discordance se signale (`DC-30`). Le message ne diagnostique
                  pas sa cause — deux reformulations concurrentes ou une version
                  écrite indépendamment produisent la même situation. */}
              {/* `ratifiable` vaut « exactement une tête » côté route : sur une
                  liste non vide, `!ratifiable` suffit à dire qu'il y en a
                  plusieurs. Doubler la condition laisserait croire que les deux
                  peuvent diverger. */}
              {!ratifiable && (
                <PatientInlineMessage tone="info">
                  Deux versions de votre objectif coexistent. Nous préférons vous les montrer toutes
                  les deux plutôt que d’en choisir une à votre place — votre praticien les
                  départagera, et vous pourrez répondre ensuite.
                </PatientInlineMessage>
              )}

              {objectifs.map((objectif) => (
                <div key={objectif.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ce que vous avez dit</p>
                    {/* `whitespace-pre-wrap` : les mots sont rendus TELS QUELS,
                        retours à la ligne compris. Les reformater serait déjà
                        les réécrire. */}
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {objectif.enoncePatient}
                    </p>
                  </div>

                  {objectif.reformulationPraticien && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Ce que votre praticien en a compris
                      </p>
                      <p className="whitespace-pre-wrap text-base leading-relaxed">
                        {objectif.reformulationPraticien}
                      </p>
                    </div>
                  )}

                  {objectif.priorite && (
                    <p className="text-sm text-muted-foreground">
                      Priorité retenue : {objectif.priorite}
                    </p>
                  )}

                  {dateLisible(objectif.negocieLe) && (
                    <p className="text-xs text-muted-foreground">
                      Convenu le {dateLisible(objectif.negocieLe)}
                    </p>
                  )}

                  <p className="text-sm">{LIBELLE_ETAT[objectif.etat] ?? LIBELLE_ETAT.en_attente}</p>

                  {/* CE QUE LE PATIENT A ÉCRIT SUR CETTE VERSION, rendu à sa
                      relecture. Le filtre sur `idObjectif` compte : une version
                      écrite pour un objectif depuis reformulé ne répond pas à
                      ce texte-ci, et l'afficher sous lui la ferait dire autre
                      chose (patron du bloc « désaccords »).
                      « Écrit le » sur `creeLe` et non « Concerne le » : c'est
                      la date d'écriture, pas une date déclarée — le patient n'a
                      jamais dit à quoi son texte se rapporte. */}
                  {amendements
                    .filter((amendement) => amendement.idObjectif === objectif.id)
                    .map((amendement) => (
                      <div
                        key={amendement.id}
                        className="space-y-1 rounded-lg border border-border bg-surface p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          Votre version{dateLisible(amendement.creeLe)
                            ? `, écrite le ${dateLisible(amendement.creeLe)}`
                            : ''}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {amendement.texte}
                        </p>
                      </div>
                    ))}

                  {ratifiable && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Votre réponse reste dans votre dossier et ne s’efface pas. Si vous changez
                        d’avis, répondez à nouveau : c’est la dernière réponse qui vaut.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <PatientButton
                          type="button"
                          variant="primary"
                          disabled={envoi}
                          onClick={() => void repondre(objectif.id, 'ratifie')}
                        >
                          C’est bien ça
                        </PatientButton>
                        <PatientButton
                          type="button"
                          variant="neutral"
                          disabled={envoi}
                          onClick={() => void repondre(objectif.id, 'conteste')}
                        >
                          Ce n’est pas exactement ça
                        </PatientButton>
                        {/* LE TROISIÈME VERBE. Il n'envoie rien : il ouvre la
                            saisie. Poster d'un clic ce que le patient n'a pas
                            encore écrit n'aurait aucun sens, et refermer la
                            saisie remet le texte à zéro — un abandon explicite,
                            jamais un envoi silencieux. */}
                        <PatientButton
                          type="button"
                          variant="neutral"
                          disabled={envoi}
                          onClick={() => {
                            setErreurEnvoi('');
                            if (amendeId === objectif.id) {
                              setAmendeId(null);
                              setTexteAmendement('');
                              return;
                            }
                            setAmendeId(objectif.id);
                            // JAMAIS PRÉ-REMPLI par l'énoncé courant : le
                            // patient écrirait alors sur les mots d'un autre,
                            // et sa « version » serait celle qu'on lui a
                            // soufflée.
                            setTexteAmendement('');
                          }}
                        >
                          {amendeId === objectif.id ? 'Annuler' : 'Le dire autrement'}
                        </PatientButton>
                      </div>

                      {amendeId === objectif.id && (
                        <div className="space-y-2 rounded-lg border border-border p-3">
                          <label
                            htmlFor={`amendement-${objectif.id}`}
                            className="block text-sm font-medium"
                          >
                            Écrivez cet objectif avec vos mots
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Votre texte est ajouté à votre dossier tel quel, sans être coupé ni
                            corrigé. Il ne remplace pas ce qui est écrit plus haut : votre praticien
                            le lira et vous en reparlerez.
                          </p>
                          <textarea
                            id={`amendement-${objectif.id}`}
                            value={texteAmendement}
                            onChange={(evenement) => setTexteAmendement(evenement.target.value)}
                            rows={5}
                            className="w-full rounded-lg border border-border bg-surface p-3 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                          {/* LA BORNE EST DITE AVANT D'ÊTRE ATTEINTE, et le
                              champ n'est PAS tronqué par `maxLength` : couper
                              en silence la version d'un patient produirait une
                              phrase que personne n'a écrite. Il la dépasse, il
                              le voit, il raccourcit. */}
                          {/* LE JUGEMENT PORTE SUR LE TEXTE UTILE, l'affichage
                              sur ce qui est tapé. Le serveur borne le texte
                              TRIMÉ ; juger ici la longueur brute rendait
                              l'écran PLUS STRICT que lui — 4 000 caractères
                              suivis d'un saut de ligne bloquaient un envoi que
                              le serveur aurait accepté (relevé en revue). */}
                          <p
                            className={
                              texteAmendement.trim().length > LONGUEUR_MAX_AMENDEMENT
                                ? 'text-xs text-status-warning'
                                : 'text-xs text-muted-foreground'
                            }
                          >
                            {texteAmendement.length} / {LONGUEUR_MAX_AMENDEMENT} caractères
                          </p>
                          <PatientButton
                            type="button"
                            variant="primary"
                            disabled={
                              envoi
                              || texteAmendement.trim().length === 0
                              || texteAmendement.trim().length > LONGUEUR_MAX_AMENDEMENT
                            }
                            onClick={() => void direAutrement(objectif.id)}
                          >
                            Envoyer ma version
                          </PatientButton>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── OÙ J'EN SUIS, À CETTE VERSION (LOT-05, `D-111`) ─────
                      Ce que le patient a déjà raconté sur CETTE version, rendu
                      à sa relecture. Même filtre que les amendements, et même
                      motif : un récit écrit pour une version depuis reformulée
                      ne parle pas de ce texte-ci. */}
                  {reponsesJalon
                    .filter((reponse) => reponse.idObjectif === objectif.id)
                    .map((reponse) => (
                      <div
                        key={reponse.id}
                        className="space-y-1 rounded-lg border border-border bg-surface p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          Où vous en étiez ({reponse.jalon})
                          {dateLisible(reponse.creeLe) ? `, écrit le ${dateLisible(reponse.creeLe)}` : ''}
                        </p>
                        <p className="whitespace-pre-wrap text-base leading-relaxed">
                          {reponse.texte}
                        </p>
                        {/* `!== null` ET NON UNE VÉRITÉ JAVASCRIPT : `0` est
                            une réponse, et `reponse.eva &&` l'aurait fait
                            disparaître de l'écran. C'est le zéro d'un patient,
                            pas une absence (`DC-24`). */}
                        {reponse.eva !== null && (
                          <p className="text-sm text-muted-foreground">
                            Sur l’échelle : {reponse.eva} sur {EVA_MAX}
                          </p>
                        )}
                      </div>
                    ))}

                  {/* LA QUESTION D'ÉTAPE. Trois conditions, et chacune répond à
                      une question différente :
                      — `jalonDu.statut === 'ouverte'` : le SERVEUR dit qu'une
                        fenêtre est ouverte. L'écran ne calcule aucune date.
                      — `ratifiable` : une seule tête. Deux versions rivales, et
                        la question ne saurait pas de laquelle elle parle.
                      — l'objectif est RATIFIÉ OU DIT AUTREMENT : demander « où
                        en êtes-vous par rapport à votre objectif » à quelqu'un
                        qui n'a pas encore dit que c'était le sien, ou qui vient
                        de dire que non, poserait la question à côté.
                      C'est une condition d'INVITATION, pas de permission : le
                      serveur, lui, n'exige pas la ratification pour accepter le
                      texte — refuser la parole d'un patient sur son propre
                      objectif serait plus grave que de ne pas la solliciter. */}
                  {/* HORS FENÊTRE, LE MOTIF EST DIT — il ne l'était pas, et
                      c'est le défaut que `jalonObjectifDu` écrit noir sur blanc
                      vouloir empêcher : « un écran qui n'affiche simplement
                      rien laisse croire à une panne ». Le module rendait un
                      motif, une prochaine ouverture, des bornes ; rien n'en
                      était affiché (relevé en revue).
                      MÊMES CONDITIONS D'INVITATION que la question elle-même :
                      un patient qui n'a pas encore répondu à son objectif n'a
                      pas à lire qu'une étape « s'ouvrira à sa date » — on ne
                      lui a même pas demandé si l'objectif était le sien.
                      Le motif vient du SERVEUR et n'est pas réécrit ici : les
                      trois cas (pas d'ancre, pas encore, toutes passées) se
                      disent différemment, et aucun ne reproche un silence. */}
                  {jalonDu.statut === 'aucune'
                    && ratifiable
                    && (objectif.etat === 'ratifie' || objectif.etat === 'dit_autrement') && (
                      <p className="text-sm text-muted-foreground">{jalonDu.motif}</p>
                    )}

                  {jalonDu.statut === 'ouverte'
                    && ratifiable
                    && (objectif.etat === 'ratifie' || objectif.etat === 'dit_autrement') && (
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        <label
                          htmlFor={`jalon-${objectif.id}`}
                          className="block text-sm font-medium"
                        >
                          Où en êtes-vous par rapport à cet objectif ?
                        </label>
                        {/* AUCUN REPROCHE, AUCUNE ATTENTE CHIFFRÉE. Ni « vous
                            deviez », ni pourcentage de progression : ce lot ne
                            pose aucun barème, et un taux d'atteinte est
                            précisément ce qu'il s'interdit de fabriquer.
                            (La garde anti-gamification lit AUSSI les
                            commentaires : citer ici la formule interdite la
                            ferait rougir sur un fichier sain.) */}
                        <p className="text-xs text-muted-foreground">
                          Dites-le avec vos mots. Il n’y a pas de bonne réponse : ce que vous écrivez
                          sert à en reparler avec votre praticien.
                        </p>
                        <textarea
                          id={`jalon-${objectif.id}`}
                          value={texteJalon}
                          onChange={(evenement) => setTexteJalon(evenement.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-border bg-surface p-3 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        />
                        {/* Même règle qu'à l'amendement : la borne est DITE,
                            le champ n'est pas tronqué, et le jugement porte sur
                            le texte utile quand l'affichage porte sur le tapé. */}
                        <p
                          className={
                            texteJalon.trim().length > LONGUEUR_MAX_REPONSE_JALON
                              ? 'text-xs text-status-warning'
                              : 'text-xs text-muted-foreground'
                          }
                        >
                          {texteJalon.length} / {LONGUEUR_MAX_REPONSE_JALON} caractères
                        </p>

                        {/* L'ÉCHELLE — FACULTATIVE, ET DITE FACULTATIVE. Aucune
                            valeur n'est pré-sélectionnée : un curseur posé au
                            milieu déposerait un chiffre que le patient n'a pas
                            choisi. Les extrémités sont nommées pour que « 0 »
                            et « 10 » ne soient pas deux nombres nus — mais rien
                            n'est gradué entre les deux, et aucune couleur ne
                            suggère un bon côté. */}
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium">
                            Si vous le souhaitez, situez-vous sur une échelle
                          </legend>
                          <p className="text-xs text-muted-foreground">
                            De {EVA_MIN} (pas du tout) à {EVA_MAX} (tout à fait). Vous pouvez ne pas
                            répondre : votre texte suffit.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(
                              { length: EVA_MAX - EVA_MIN + 1 },
                              (_, index) => EVA_MIN + index,
                            ).map((valeur) => (
                              <button
                                key={valeur}
                                type="button"
                                aria-pressed={evaJalon === valeur}
                                disabled={envoi}
                                onClick={() => setEvaJalon(valeur)}
                                className={
                                  evaJalon === valeur
                                    ? 'min-h-11 min-w-11 rounded-lg border border-border bg-accent px-3 text-base font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'
                                    : 'min-h-11 min-w-11 rounded-lg border border-border bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'
                                }
                              >
                                {valeur}
                              </button>
                            ))}
                          </div>
                          {/* RETIRER SA VALEUR DOIT ÊTRE POSSIBLE. Sans ce
                              bouton, un patient qui a cliqué par erreur ne peut
                              plus revenir au silence — il n'aurait que le choix
                              d'un autre chiffre. */}
                          {evaJalon !== null && (
                            <PatientButton
                              type="button"
                              variant="neutral"
                              disabled={envoi}
                              onClick={() => setEvaJalon(null)}
                            >
                              Retirer ma réponse à l’échelle
                            </PatientButton>
                          )}
                        </fieldset>

                        <PatientButton
                          type="button"
                          variant="primary"
                          disabled={
                            envoi
                            || texteJalon.trim().length === 0
                            || texteJalon.trim().length > LONGUEUR_MAX_REPONSE_JALON
                          }
                          onClick={() => void direOuJenSuis(objectif.id, jalonDu.jalon)}
                        >
                          Envoyer où j’en suis
                        </PatientButton>
                      </div>
                    )}
                </div>
              ))}

              {/* DEUX ACCUSÉS, PAS UN. « Tel que vous l'avez indiqué » convient
                  à un clic ; sur un texte, il laisserait le patient se demander
                  si ses mots sont partis entiers. */}
              {/* ── CE QUE LE PATIENT A ÉCRIT SUR UNE VERSION DEPUIS
                     REFORMULÉE ──────────────────────────────────────────────
                  La route ne sert que les TÊTES de chaîne : un amendement écrit
                  sur `v1` n'a plus de version à l'écran dès que le praticien
                  pose `v2`. Sans ce bloc, le patient voyait SES PROPRES MOTS
                  disparaître au premier geste du praticien — exactement ce que
                  le contrat de la route s'engage à ne pas faire, et ce que
                  l'en-tête de ce fichier dit vouloir éviter (relevé en revue).

                  IL EST RENDU À PART, ET PAS SOUS UNE TÊTE : rattacher ces
                  textes à l'objectif courant les ferait répondre à une
                  formulation qu'ils n'ont jamais vue — et avec deux têtes
                  rivales, à laquelle ? Ici, ils sont ce qu'ils sont : ce que le
                  patient a écrit, avant. */}
              {(() => {
                const servis = new Set(objectifs.map((objectif) => objectif.id));
                const anterieurs = amendements.filter(
                  (amendement) => !servis.has(amendement.idObjectif),
                );
                if (anterieurs.length === 0) return null;
                return (
                  <div className="space-y-2 rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Vous avez écrit ceci sur une formulation précédente de votre objectif. Rien
                      ne s’efface : votre praticien le lit toujours.
                    </p>
                    {anterieurs.map((amendement) => (
                      <div key={amendement.id} className="space-y-1 border-l-2 border-border pl-3">
                        {dateLisible(amendement.creeLe) && (
                          <p className="text-xs text-muted-foreground">
                            Écrit le {dateLisible(amendement.creeLe)}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-base leading-relaxed">
                          {amendement.texte}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── ET LES RÉCITS D'ÉTAPE ÉCRITS AVANT UNE REFORMULATION ─────
                  LE MÊME BLOC, POUR LA MÊME RAISON, ET IL MANQUAIT AU LOT-05
                  (relevé en revue). La route ne sert que les TÊTES : un récit
                  écrit sur `v1` n'avait plus de version à l'écran dès que le
                  praticien posait `v2`, et le patient voyait disparaître ce
                  qu'il avait mis dix minutes à écrire — pendant que le
                  praticien, lui, continuait de le lire au cockpit, qui filtre
                  sur TOUTE la chaîne. Asymétrie exactement inverse de celle
                  qu'on veut. C'est le patron du LOT-03 : une garde corrigée ne
                  corrige pas sa sœur — le bloc au-dessus existait déjà, et son
                  commentaire décrivait ce défaut mot pour mot.
                  SANS LEUR JALON NI LEUR EVA ICI, à dessein : rattacher
                  « J21 » à une formulation qui n'est plus à l'écran
                  demanderait au patient de reconstituer par rapport à quoi il
                  se situait. Ce qui reste, c'est ce qu'il a écrit, et quand. */}
              {(() => {
                const servis = new Set(objectifs.map((objectif) => objectif.id));
                const anterieurs = reponsesJalon.filter(
                  (reponse) => !servis.has(reponse.idObjectif),
                );
                if (anterieurs.length === 0) return null;
                return (
                  <div className="space-y-2 rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Vous avez dit où vous en étiez sur une formulation précédente de votre
                      objectif. Rien ne s’efface : votre praticien le lit toujours.
                    </p>
                    {anterieurs.map((reponse) => (
                      <div key={reponse.id} className="space-y-1 border-l-2 border-border pl-3">
                        {dateLisible(reponse.creeLe) && (
                          <p className="text-xs text-muted-foreground">
                            Écrit le {dateLisible(reponse.creeLe)}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-base leading-relaxed">
                          {reponse.texte}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {repondu === 'reponse' && (
                <PatientInlineMessage tone="success">
                  C’est transmis. Votre praticien le verra tel que vous l’avez indiqué.
                </PatientInlineMessage>
              )}
              {repondu === 'version' && (
                <PatientInlineMessage tone="success">
                  C’est transmis. Votre praticien lira votre version, mot pour mot.
                </PatientInlineMessage>
              )}
              {/* TROISIÈME ACCUSÉ, et non un des deux précédents recyclé : ce
                  n'est ni un clic ni une reformulation de l'objectif. Dire que
                  « votre version » est partie après un récit d'étape laisserait
                  croire que l'objectif lui-même a changé. */}
              {repondu === 'etape' && (
                <PatientInlineMessage tone="success">
                  C’est transmis. Votre praticien lira où vous en êtes, tel que vous l’avez écrit.
                </PatientInlineMessage>
              )}
              {erreurEnvoi && (
                <PatientInlineMessage tone="error">{erreurEnvoi}</PatientInlineMessage>
              )}
            </>
          )}
        </section>
      </PatientCard>

      {/* ── CE QUI COMPTE POUR MOI ────────────────────────────────────────
          `null` = bloc non ouvert : rien n'est rendu, pas même un titre. */}
      {ceQuiCompte !== null && (
        <PatientCard className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce qui compte pour moi
          </h2>
          {ceQuiCompte.length === 0 ? (
            <PatientInlineMessage tone="info">
              Vous n’avez encore rien déposé ici. Rien ne vous y oblige.
            </PatientInlineMessage>
          ) : (
            <ul className="space-y-3">
              {ceQuiCompte.map((entree) => (
                <li key={entree.id} className="space-y-1 border-l-2 border-border pl-3">
                  {/* JAMAIS `saisiLe ?? creeLe`. Les deux dates ne disent pas
                      la même chose : `saisiLe` est ce que le patient a DÉCLARÉ
                      (« cela se rapporte à ce jour-là »), `creeLe` est le
                      moment où la ligne a été écrite. Les fusionner ferait lire
                      au patient, en tête de sa propre parole, une date qu'il
                      n'a jamais donnée — une absence rendue comme une réponse
                      (`DC-24`), et exactement ce que le LOT-03 s'interdit
                      « ici ni à l'affichage ». Rien n'est affiché quand rien
                      n'a été déclaré : le silence reste un silence. */}
                  {dateLisible(entree.saisiLe) && (
                    <p className="text-xs text-muted-foreground">
                      Concerne le {dateLisible(entree.saisiLe)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{entree.texte}</p>
                </li>
              ))}
            </ul>
          )}
          <a
            href={`/portail/${token}/ce-qui-compte`}
            className="inline-flex text-sm text-primary hover:underline"
          >
            Déposer ce qui compte pour moi aujourd’hui
          </a>
        </PatientCard>
      )}

      {/* ── CE QUE MON PRATICIEN A COMPRIS ────────────────────────────────── */}
      {comprehension !== null && (
        <PatientCard className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce que mon praticien a compris de moi
          </h2>
          {!comprehension.synthese ? (
            <PatientInlineMessage tone="info">
              Votre praticien n’a encore rien publié ici. Cela ne veut rien dire de plus : il n’a
              simplement pas encore écrit cette page.
            </PatientInlineMessage>
          ) : (
            <>
              {/* MÊME RÈGLE, DEUXIÈME DATE. « Écrit le » sur une date de
                  PUBLICATION attribuerait au praticien une déclaration qu'il
                  n'a pas faite : `redigeeLe` est ce qu'il déclare, `publieeLe`
                  le moment où il a remis le texte. On dit celle qu'on a, sous
                  son vrai nom, sans jamais faire passer l'une pour l'autre. */}
              {dateLisible(comprehension.synthese.redigeeLe) ? (
                <p className="text-xs text-muted-foreground">
                  Écrit le {dateLisible(comprehension.synthese.redigeeLe)}
                </p>
              ) : (
                dateLisible(comprehension.synthese.publieeLe) && (
                  <p className="text-xs text-muted-foreground">
                    Publié le {dateLisible(comprehension.synthese.publieeLe)}
                  </p>
                )
              )}
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {comprehension.synthese.texte}
              </p>
              {/* CE QUE LE PATIENT A DÉJÀ RÉPONDU, sur CETTE version. Sans ce
                  bloc, un patient qui a contesté au LOT-04 ne le verrait nulle
                  part ici, et l'invitation ci-dessous lui parlerait comme s'il
                  n'avait rien dit — la parenté exacte du défaut trouvé en revue
                  au LOT-04. Le filtre sur `idSynthese` compte : un désaccord
                  visant une version antérieure ne répond pas à ce texte-ci, et
                  l'afficher sous lui le ferait dire autre chose. */}
              {comprehension.desaccords
                .filter((desaccord) => desaccord.idSynthese === comprehension.synthese!.id)
                .map((desaccord) => (
                  <div
                    key={desaccord.id}
                    className="space-y-1 rounded-lg border border-border bg-surface p-3"
                  >
                    <p className="text-xs text-muted-foreground">Vous avez répondu à ce texte</p>
                    {desaccord.texte && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {desaccord.texte}
                      </p>
                    )}
                  </div>
                ))}

              {/* Le désaccord se DÉPOSE sur sa page, pas ici : il n'y a qu'un
                  seul endroit dans l'application qui en écrit un, et c'est une
                  garde structurelle qui le tient. */}
              <a
                href={`/portail/${token}/comprehension`}
                className="inline-flex text-sm text-primary hover:underline"
              >
                Répondre à ce texte
              </a>
            </>
          )}
        </PatientCard>
      )}
    </div>
  );
}
