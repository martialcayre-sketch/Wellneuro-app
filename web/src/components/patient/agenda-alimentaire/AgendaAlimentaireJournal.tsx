'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { estAvantFinFenetreAli, type FenetreAgendaAli } from '@/lib/agenda-alimentaire/fenetre';
import { decalerDate } from '@/lib/agenda-alimentaire/jour';
import { NB_JOURS_AGENDA_ALI, type JourReponses } from '@/lib/agenda-alimentaire/types';
import { FriseJournees } from './FriseJournees';
import { SaisieJourneeForm } from './SaisieJourneeForm';

// Chef d'orchestre de l'agenda alimentaire côté patient — jumeau structurel de
// `AgendaSommeilJournal.tsx` : trois modes, un GET au chargement, un POST par
// journée, et `charger()` après chaque écriture.
//
// ── AUCUN AGRÉGAT NE PASSE PAR ICI ─────────────────────────────────────────
// `lib/agenda-alimentaire/agregats.ts` n'est PAS importé, et ne doit pas
// l'être : le seul chiffre montré au patient est un COMPTE DE SAISIES. Aucune
// moyenne, aucune fenêtre alimentaire, aucun jeûne, aucun indice, aucune
// tendance, aucune couleur d'alarme. Un constat adossé à l'acte de noter, jamais
// à ce qui est noté — sans quoi le design apprendrait en quelques jours à
// déclarer de belles journées, et biaiserait l'instrument qu'il sert.
//
// ── PAS DE CLÔTURE PATIENT ─────────────────────────────────────────────────
// Aucun bouton « Terminer et transmettre » : il n'existe aucune route de
// clôture alimentaire. Le jumeau du sommeil en a une ; recopier son bouton ici
// produirait un 404 sur un geste présenté comme possible.
//
// ── LA CORRECTION EST UN CHEMIN OUVERT, PAS UNE IMPASSE ────────────────────
// La route accepte de rejouer une journée déjà notée si le POST porte un
// `supersedesJourId` désignant sa tête de chaîne active. Cette capacité est
// restée INATTEIGNABLE tant que le GET ne rendait pas l'`id` des journées : le
// client n'avait pas de quoi le fournir, et tout renvoi retombait en 409
// `deja_notee`. L'`id` sort désormais du GET, l'écran le repasse au POST, et le
// bouton « Modifier » — retiré à raison plutôt que de proposer un geste voué au
// refus — est rétabli.
//
// ── DEUX INVARIANTS QUI VIENNENT DE TOMBER ─────────────────────────────────
// 1. `emplacements[0].renseignee` n'est plus nécessairement vrai : l'ancre peut
//    venir d'une ligne en QUARANTAINE, jamais relue.
// 2. `dateDebut !== null` n'implique plus `jours.length > 0` : un GET peut
//    rendre une fenêtre peuplée avec `jours: []` et `derniereJournee: null`.
// Rien ici ne déduit « il y a une fenêtre donc il y a une journée » : aucun
// `jours[0]`, aucun `at(-1)`, et les décisions passent par les DRAPEAUX de
// chaque emplacement.

type GetOk = {
  ok: true;
  fenetre: FenetreAgendaAli;
  /**
   * `id` est la TÊTE DE CHAÎNE ACTIVE de la date, seule valeur que le POST
   * accepte comme `supersedesJourId`. C'est elle qui rend la correction
   * atteignable depuis l'écran : sans elle, tout renvoi sur une date déjà notée
   * retombait en 409 `deja_notee`.
   */
  jours: { id: string; dateJour: string; reponses: JourReponses }[];
  derniereJournee: JourReponses | null;
  statutReponses: string;
  aujourdHui: string;
  illisibles: number;
};

type Props = { idAssignation: string; onRetourHub: () => void };

type EtatSaisieDate = 'saisie' | 'correction' | 'bloquee';

/**
 * Ce que le patient peut ENCORE faire sur cette date. Trois états, pas deux —
 * c'est l'ajustement qui ouvre la correction.
 *
 * « Déjà notée » N'EST PLUS UN MOTIF DE BLOCAGE : la route accepte de rejouer
 * une journée dès lors que le POST porte un `supersedesJourId` désignant sa tête
 * de chaîne active, et le GET rend désormais cet identifiant. Le prédicat
 * booléen précédent (`peutNoter`) confondait « rien à écrire ici » et « écriture
 * d'une nature différente » : il retirait le geste au lieu de le nommer.
 *
 * Restent bloquantes, avec leurs motifs distincts :
 *  - la QUARANTAINE — toute écriture sur la date est refusée en 409
 *    `agenda_illisible`, correction comprise ; testée AVANT `renseignee`, les
 *    deux drapeaux n'étant pas exclusifs (modèle append-only) ;
 *  - la FIN DE FENÊTRE — la borne des 21 jours porte sur la DATE et non sur
 *    l'état de la ligne : une journée au-delà de la fin ne se corrige pas
 *    davantage qu'elle ne se note (409 `hors_fenetre_21j`).
 *
 * La borne passe par `estAvantFinFenetreAli`, jamais par une arithmétique de
 * date réécrite ici : deux bornes écrites deux fois, c'est deux bornes à tenir
 * d'accord. Et la borne J / J-1 (`estDateSaisissable`) n'est PAS redoublée :
 * elle est tenue par la route, et l'écran ne propose de toute façon que ces deux
 * dates.
 *
 * ── AUCUNE BORNE INFÉRIEURE, ICI NON PLUS ───────────────────────────────────
 * `estAvantFinFenetreAli` ne borne QUE la fin (D-022). Une date ANTÉRIEURE à
 * l'ancre est donc écrivable, et le POST la fera RECULER : c'est ce qui rend au
 * patient le premier jour de son recueil quand il note la veille juste après
 * avoir noté aujourd'hui. Garder ici le refus qu'on vient de retirer de la route
 * aurait rendu la capacité inatteignable depuis l'écran — le défaut exact que ce
 * lot ferme partout ailleurs.
 */
function etatSaisie(fenetre: FenetreAgendaAli, date: string): EtatSaisieDate {
  if (!estAvantFinFenetreAli(date, fenetre.dateDebut)) return 'bloquee';
  const emp = fenetre.emplacements.find((e) => e.dateJour === date);
  // Aucun emplacement pour cette date, et la borne supérieure est franchie :
  // il ne reste que DEUX cas, tous deux OUVERTS à l'écriture — l'agenda est VIDE
  // (le premier POST posera l'ancre), ou la date PRÉCÈDE l'ancre (le POST la
  // fera reculer). Les 21 emplacements couvrant exactement [ancre, ancre+20],
  // aucune date interne ne peut tomber ici.
  if (emp === undefined) return 'saisie';
  if (emp.illisible === true) return 'bloquee';
  return emp.renseignee === true ? 'correction' : 'saisie';
}

/**
 * Pourquoi la journée du jour n'est ni notable ni corrigible — un motif par
 * cause, aucune formule fourre-tout. Un patient à qui l'on dit « déjà notée »
 * alors que sa saisie est illisible ne comprendrait ni son écran, ni le refus
 * qui suivrait.
 *
 * LA BRANCHE « déjà notée » A DISPARU D'ICI, et ce n'est pas un oubli : une
 * journée notée mais lisible et dans la fenêtre n'est plus bloquée du tout —
 * elle ouvre « Modifier ma journée ». Le seul cas où une date notée revient dans
 * cette fonction est celui où elle porte AUSSI une ligne en quarantaine, et le
 * motif à donner est alors celui de la quarantaine, jamais celui de la saisie
 * existante.
 */
export function motifAujourdHuiNonNotable(fenetre: FenetreAgendaAli, aujourdHui: string): string {
  const emp = fenetre.emplacements.find((e) => e.dateJour === aujourdHui);
  if (emp !== undefined && emp.illisible === true) {
    return 'Nous n’avons pas pu relire la saisie de cette journée. Signalez-le à votre praticien : votre agenda continue normalement demain.';
  }
  // Comme le refus de la route : ce qui est écoulé, c'est la PÉRIODE. « Votre
  // recueil couvre déjà ses 21 jours » affirmait 21 journées notées à un patient
  // qui pouvait n'en avoir noté qu'une — la fenêtre peut être TROUÉE.
  return 'Votre période de recueil de 21 jours est écoulée. Vous pouvez relire vos journées ici.';
}

export function AgendaAlimentaireJournal({ idAssignation, onRetourHub }: Props) {
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState('');
  const [data, setData] = useState<GetOk | null>(null);
  const [mode, setMode] = useState<'frise' | 'saisie' | 'clos'>('frise');
  const [cibleDate, setCibleDate] = useState<string>('');
  const [envoi, setEnvoi] = useState(false);
  const [merci, setMerci] = useState(false);

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const res = await fetch(
        `/api/portail/agenda-alimentaire?id=${encodeURIComponent(idAssignation)}`,
      );
      const json = (await res.json()) as GetOk | { ok: false; error: string };
      if (!json.ok) {
        setErreur(json.error);
        setEtat('erreur');
        return;
      }
      setData(json);
      // `modification_demandee` est clos AU MÊME TITRE que `verrouille` : la
      // route refuse les deux en 409 `locked`. N'en retenir qu'un ouvrirait un
      // formulaire dont chaque envoi serait refusé.
      if (json.statutReponses === 'verrouille' || json.statutReponses === 'modification_demandee') {
        setMode('clos');
      } else if (etatSaisie(json.fenetre, json.aujourdHui) === 'saisie') {
        // Ouverture DIRECTE sur la journée du jour : le geste attendu est
        // l'unique geste, et il n'y a pas d'écran intermédiaire à franchir.
        //
        // `=== 'saisie'` et NON `!== 'bloquee'` : une journée déjà notée n'ouvre
        // PAS le formulaire d'office. Corriger est un geste délibéré, et ouvrir
        // d'emblée un formulaire pré-rempli à chaque rechargement inviterait à
        // repasser sur une journée close au lieu de la laisser tranquille.
        setCibleDate(json.aujourdHui);
        setMode('saisie');
      } else {
        setMode('frise');
      }
      setEtat('pret');
    } catch {
      setErreur('Connexion interrompue. Réessayez.');
      setEtat('erreur');
    }
  }, [idAssignation]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Une entrée par date : les réponses PRÉ-REMPLISSENT le formulaire d'une
  // correction, et l'`id` part en `supersedesJourId`. Les deux viennent de la
  // même ligne — les séparer en deux tables ouvrirait la possibilité de corriger
  // une journée avec l'identifiant d'une autre.
  const joursParDate = useMemo(() => {
    const m = new Map<string, { id: string; reponses: JourReponses }>();
    for (const j of data?.jours ?? []) m.set(j.dateJour, { id: j.id, reponses: j.reponses });
    return m;
  }, [data]);

  async function enregistrer(reponses: JourReponses) {
    setEnvoi(true);
    // Présent SEULEMENT si cette date porte déjà une journée active : la route
    // refuse un `supersedesJourId` sur une date vierge (409
    // `correction_invalide`) autant qu'une écriture NUE sur une date notée (409
    // `deja_notee`). La clé est donc OMISE, jamais posée à `undefined` explicite.
    const supersedesJourId = joursParDate.get(cibleDate)?.id;
    try {
      const res = await fetch('/api/portail/agenda-alimentaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAssignation,
          dateJour: cibleDate,
          reponses,
          ...(supersedesJourId === undefined ? {} : { supersedesJourId }),
        }),
      });
      const json = (await res.json()) as { ok: boolean; reason?: string; error?: string };
      if (!json.ok) {
        // Le message de refus vient du SERVEUR, tel quel : c'est lui qui sait
        // s'il s'agit d'une date hors fenêtre, d'un recueil déjà complet, d'une
        // journée illisible ou d'une réponse manquante. En réinventer un ici
        // ferait deux vocabulaires pour un seul refus.
        setErreur(json.error ?? 'Enregistrement impossible.');
        setEnvoi(false);
        // COURSE ENTRE DEUX APPAREILS. Ces deux refus-là disent la même chose :
        // la tête de chaîne de cette date n'est plus celle que l'écran croyait
        // tenir — quelqu'un a noté (ou corrigé) la journée ailleurs entre le GET
        // et le POST. Renvoyer le même formulaire échouerait à l'identique,
        // indéfiniment. On relit donc le serveur, seul porteur de l'état réel ;
        // le message de refus, lui, survit au rechargement (`charger` ne touche
        // pas `erreur`) et reste sous les yeux du patient.
        if (json.reason === 'correction_invalide' || json.reason === 'deja_notee') {
          await charger();
        }
        return;
      }
      setEnvoi(false);
      setMerci(true);
      setTimeout(() => setMerci(false), 2200);
      // JAMAIS de mutation optimiste : la fenêtre, les drapeaux d'illisibilité
      // et le compte se relisent du serveur, seul porteur de l'état réel.
      await charger();
    } catch {
      setErreur('Connexion interrompue. Réessayez.');
      setEnvoi(false);
    }
  }

  if (etat === 'chargement') {
    return (
      <PatientCard className="text-center">
        <p className="text-sm text-muted-foreground">Chargement de votre agenda…</p>
      </PatientCard>
    );
  }
  if (etat === 'erreur' || data === null) {
    return (
      <PatientCard className="text-center">
        <PatientErrorState
          message={erreur || 'Agenda indisponible.'}
          onReessayer={() => void charger()}
          aide="Si le problème persiste, contactez votre praticien."
        />
        <div className="mt-4">
          <PatientButton variant="neutral" onClick={onRetourHub}>
            Retour à mon parcours
          </PatientButton>
        </div>
      </PatientCard>
    );
  }

  const { fenetre, aujourdHui } = data;
  const dateHier = decalerDate(aujourdHui, -1);
  const etatAujourdHui = etatSaisie(fenetre, aujourdHui);
  // `dateDebut !== null` : sur un agenda VIDE, `etatSaisie` rend « saisie » pour
  // n'importe quelle date — c'est le premier POST qui posera l'ancre. Proposer
  // « hier » là ancrerait le recueil un jour trop tôt, sans que le patient l'ait
  // demandé.
  const etatHier = fenetre.dateDebut === null ? 'bloquee' : etatSaisie(fenetre, dateHier);

  // Agenda clôturé : frise en consultation seule, aucune saisie.
  if (mode === 'clos') {
    return (
      <div className="space-y-4">
        <PatientCard>
          <h2 className="font-display text-lg font-bold text-foreground mb-1">
            Merci pour vos trois semaines 🥗
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Votre agenda est entre les mains de votre praticien. Voici la frise de vos journées.
          </p>
          <FriseJournees emplacements={fenetre.emplacements} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {fenetre.nbRenseignees} journée{fenetre.nbRenseignees > 1 ? 's' : ''} notée
            {fenetre.nbRenseignees > 1 ? 's' : ''} sur {NB_JOURS_AGENDA_ALI}.
          </p>
        </PatientCard>
        <PatientButton variant="neutral" onClick={onRetourHub}>
          Retour à mon parcours
        </PatientButton>
      </div>
    );
  }

  // Écran de saisie d'une journée.
  if (mode === 'saisie') {
    const journeeVisee = joursParDate.get(cibleDate);
    // DEUX AXES INDÉPENDANTS, et les confondre produisait un titre faux dans
    // deux cas sur quatre : la DATE (aujourd'hui ou la veille) et la NATURE du
    // geste (première saisie ou correction). La nature se lit sur la présence
    // d'une journée active — c'est exactement ce qui décide aussi de l'envoi
    // d'un `supersedesJourId`, donc les deux ne peuvent pas diverger.
    const cibleEstHier = cibleDate !== aujourdHui;
    const enCorrection = journeeVisee !== undefined;
    const titre = enCorrection
      ? cibleEstHier
        ? 'Corriger la journée d’hier'
        : 'Modifier votre journée'
      : cibleEstHier
        ? 'Noter la journée d’hier'
        : 'Votre journée';
    return (
      <div className="space-y-4">
        <PatientCard>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">{titre}</h2>
            {fenetre.jourCourant !== null && (
              <span className="shrink-0 text-sm text-muted-foreground">
                Jour {fenetre.jourCourant} sur {NB_JOURS_AGENDA_ALI}
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            En moins d’une minute : à quelles heures vous avez mangé, et ce qu’il y avait dans
            l’assiette. Une estimation suffit.
          </p>
          {erreur !== '' && (
            <div className="mb-4">
              <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>
            </div>
          )}
          {/* `key` remonte le formulaire à chaque changement de date : sans elle,
              l'état d'une journée resterait posé sur la suivante — c'est le
              report automatique par la porte de derrière. `initial` ne vaut que
              la journée VISÉE, jamais la veille : sur une CORRECTION il porte les
              réponses déjà enregistrées (seul cas de pré-remplissage — la
              doctrine « rien n'est pré-coché » vise la saisie initiale, et une
              correction qui repartirait de zéro obligerait à ressaisir les
              quatre présences pour en changer une), sur une première saisie il
              vaut `null` et l'écran s'ouvre vierge.

              Les états `null` (« je ne sais pas ») traversent tels quels :
              `SaisieJourneeForm` compare explicitement, jamais par véracité —
              une abstention relue se réaffiche en abstention, pas en « non ». */}
          <SaisieJourneeForm
            key={cibleDate}
            initial={journeeVisee?.reponses ?? null}
            submitting={envoi}
            ctaLabel={
              enCorrection ? 'Corriger ✓' : cibleEstHier ? 'C’est noté pour hier ✓' : 'C’est noté ✓'
            }
            onSubmit={enregistrer}
          />
        </PatientCard>
        <PatientButton
          variant="neutral"
          onClick={() => {
            setErreur('');
            setMode('frise');
          }}
        >
          Voir ma frise
        </PatientButton>
      </div>
    );
  }

  // Vue frise — par défaut dès que la journée du jour n'est plus à noter.
  return (
    <div className="space-y-4">
      {merci && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
          Merci, à demain. 🥗
        </div>
      )}
      {erreur !== '' && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      <PatientCard>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Vos journées</h2>
          {fenetre.jourCourant !== null && (
            <span className="shrink-0 text-sm text-muted-foreground">
              Jour {fenetre.jourCourant} sur {NB_JOURS_AGENDA_ALI}
            </span>
          )}
        </div>
        <FriseJournees emplacements={fenetre.emplacements} />
        {/* Constat ADOSSÉ À L'ACTE DE NOTER, jamais à ce qui est noté : un compte
            de saisies, et rien d'autre. */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {fenetre.nbRenseignees} journée{fenetre.nbRenseignees > 1 ? 's' : ''} notée
          {fenetre.nbRenseignees > 1 ? 's' : ''} sur {NB_JOURS_AGENDA_ALI}.
          {fenetre.nbRenseignees < NB_JOURS_AGENDA_ALI
            ? ' Une journée oubliée, ça arrive — reprenez simplement demain.'
            : ' Vous avez noté chaque journée du recueil. Merci.'}
        </p>
      </PatientCard>

      {/* Un bouton par geste RÉELLEMENT ouvert côté route, et une carte de motif
          quand il n'y en a aucun. « Modifier ma journée » calque le jumeau du
          sommeil : la journée notée n'est pas une impasse, elle se rouvre. */}
      <div className="flex flex-col gap-2">
        {etatAujourdHui === 'saisie' && (
          <PatientButton
            variant="primary"
            onClick={() => {
              setErreur('');
              setCibleDate(aujourdHui);
              setMode('saisie');
            }}
          >
            Noter ma journée
          </PatientButton>
        )}
        {etatAujourdHui === 'correction' && (
          <PatientButton
            variant="ghost"
            onClick={() => {
              setErreur('');
              setCibleDate(aujourdHui);
              setMode('saisie');
            }}
          >
            Modifier ma journée
          </PatientButton>
        )}
        {etatAujourdHui === 'bloquee' && (
          <PatientCard padding="sm" className="text-xs text-muted-foreground">
            {motifAujourdHuiNonNotable(fenetre, aujourdHui)}
          </PatientCard>
        )}

        {etatHier === 'saisie' && (
          <PatientButton
            variant="ghost"
            onClick={() => {
              setErreur('');
              setCibleDate(dateHier);
              setMode('saisie');
            }}
          >
            Noter la journée d’hier
          </PatientButton>
        )}
        {etatHier === 'correction' && (
          <PatientButton
            variant="neutral"
            onClick={() => {
              setErreur('');
              setCibleDate(dateHier);
              setMode('saisie');
            }}
          >
            Corriger la journée d’hier
          </PatientButton>
        )}
      </div>

      <PatientCard padding="sm" className="text-xs text-muted-foreground">
        Astuce : ajoutez cette page à l’écran d’accueil de votre téléphone pour la retrouver chaque
        soir.
      </PatientCard>

      <PatientButton variant="neutral" onClick={onRetourHub}>
        Retour à mon parcours
      </PatientButton>
    </div>
  );
}
