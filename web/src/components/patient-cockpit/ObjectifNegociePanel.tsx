'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AncrageAnamnese,
  ObjectifExpose,
  ObjectifsApiResponse,
  TrajectoireObjectif,
} from '@/app/api/praticien/objectifs/route';
import type {
  FragmentExpose,
  PropositionExposee,
  PropositionsApiResponse,
} from '@/app/api/praticien/propositions-objectif/route';
import {
  LONGUEUR_MAX_ENONCE,
  LONGUEUR_MAX_MOTIF,
  LONGUEUR_MAX_PRIORITE,
  LONGUEUR_MAX_REFORMULATION,
  type EtatRatification,
} from '@/lib/praticien/objectifNegocie';
import { LONGUEUR_MAX_MOTIF_ECART } from '@/lib/praticien/propositionObjectif';

// L'objectif négocié (Alliance 6.0-A, LOT-02) — surface praticien, phase
// « Compréhension » du poste de pilotage.
//
// Le panneau est AUTONOME : il ne reçoit que l'identifiant du dossier et lit
// tout ce dont il a besoin. Il vit donc hors du runtime clinique, et c'est
// délibéré — un objectif se négocie AVANT qu'un épisode soit confirmé, pas
// après. Le banc de rendu de `FichePatientPanel` le vérifie sans épisode.
//
// Le refus qui fait foi (dossier clos, bornes, appariement du « non traité »)
// est celui de la ROUTE (#181) : ce que l'écran empêche est une courtoisie, et
// le message du serveur est affiché tel quel s'il survient.

type EtatDossier = 'chargement' | 'chargee' | 'erreur';
type EtatEnvoi = 'repos' | 'envoi' | 'erreur';

/**
 * L'état du bloc « propositions » (Alliance 6.0-B, LOT-03).
 *
 * `fermee` N'EST PAS `vide`, ET LA DISTINCTION EST TOUT LE SUJET. Drapeau
 * éteint, la route rend `503` et le bloc est ABSENT de l'écran — pas « aucune
 * proposition », qui se lirait comme un constat sur le dossier du patient
 * (`DC-24`). Ouverte et sans ligne, le bloc s'affiche et le dit avec ses mots.
 */
type EtatPropositions = 'chargement' | 'ouverte' | 'fermee' | 'erreur';

/**
 * La provenance d'un fragment, telle qu'elle revient du JSONB. Le type de la
 * route l'expose en `unknown` — délibérément : la forme est garantie par les
 * FABRIQUES du moteur, à l'écriture, et l'écran ne la re-valide pas. Il la
 * LIT prudemment, et ce qu'il ne reconnaît pas, il ne l'affiche pas comme une
 * source.
 */
type SourceLue =
  | { nature: 'anamnese'; champ: string; dateConsultation: string }
  | { nature: 'instrument'; instrument: string; domaine: string; restitution: string | null }
  | { nature: 'regle_signee'; regle: string; shaPerimetre: string }
  | null;

function lireSource(brut: unknown): SourceLue {
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const source = brut as Record<string, unknown>;
  const texte = (cle: string) => (typeof source[cle] === 'string' ? (source[cle] as string) : '');
  if (source.nature === 'anamnese') {
    return { nature: 'anamnese', champ: texte('champ'), dateConsultation: texte('dateConsultation') };
  }
  if (source.nature === 'instrument') {
    return {
      nature: 'instrument',
      instrument: texte('instrument'),
      domaine: texte('domaine'),
      restitution: typeof source.restitution === 'string' ? source.restitution : null,
    };
  }
  if (source.nature === 'regle_signee') {
    return { nature: 'regle_signee', regle: texte('regle'), shaPerimetre: texte('shaPerimetre') };
  }
  return null;
}

/** Les trois champs d'anamnèse citables, nommés comme l'écran les nomme déjà. */
const LIBELLE_CHAMP: Record<string, string> = {
  motif_principal: 'Motif principal',
  objectif_prioritaire: 'Objectif prioritaire déclaré',
  attentes: 'Attentes principales',
};

/**
 * La provenance, écrite en toutes lettres sous chaque fragment.
 *
 * ELLE N'EST JAMAIS ABRÉGÉE NI OMISE : un fragment sans sa source affichée
 * redeviendrait une phrase que Wellneuro semble avoir écrite. Le SHA du
 * périmètre signé est montré en entier — tronqué, il ne prouverait rien et
 * donnerait l'apparence d'une preuve.
 */
function Provenance({ source }: { source: SourceLue }) {
  if (!source) {
    return (
      <p className="mt-1 text-xs text-status-warning">
        Provenance illisible : cette phrase ne s’affiche pas comme une citation.
      </p>
    );
  }
  if (source.nature === 'anamnese') {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {LIBELLE_CHAMP[source.champ] ?? source.champ} — mots du patient à l’anamnèse
        {source.dateConsultation ? ` du ${formatDate(source.dateConsultation)}` : ''}
      </p>
    );
  }
  if (source.nature === 'instrument') {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Restitution publiée par {source.instrument} — {source.domaine}
      </p>
    );
  }
  return (
    <p className="mt-1 break-all text-xs text-muted-foreground">
      Règle signée {source.regle} — périmètre {source.shaPerimetre}
    </p>
  );
}

/**
 * Un fragment cité, avec sa provenance et — s'il est reprenable — le geste qui
 * en fait l'énoncé du patient.
 *
 * `onReprendre` ABSENT N'EST PAS UN BOUTON GRISÉ : le fragment reste
 * parfaitement lisible, il n'est simplement pas une parole du patient. Griser
 * un bouton laisserait croire à une permission manquante ; la phrase dit ce
 * qu'il en est.
 */
function FragmentCite({
  fragment,
  onReprendre,
  choisi,
}: {
  fragment: FragmentExpose;
  onReprendre?: () => void;
  choisi: boolean;
}) {
  const source = lireSource(fragment.source);
  return (
    <li className="border-l-2 border-border pl-3">
      <p className="whitespace-pre-wrap text-base text-foreground">« {fragment.texte} »</p>
      <Provenance source={source} />
      {onReprendre ? (
        <button
          type="button"
          onClick={onReprendre}
          aria-pressed={choisi}
          className={`mt-1 min-h-9 rounded-lg px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
            choisi
              ? 'border border-accent text-solar-ink'
              : 'text-muted-foreground hover:underline'
          }`}
        >
          {choisi ? 'Citation retenue' : 'Reprendre cette phrase'}
        </button>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Ce n’est pas une parole du patient : elle éclaire la proposition, elle ne devient pas son énoncé.
        </p>
      )}
    </li>
  );
}

const ANCRAGE_VIDE: AncrageAnamnese = {
  consultationValidee: false,
  motifPrincipal: null,
  objectifPrioritaire: null,
  attentes: [],
};

const LIBELLE_RATIFICATION: Record<EtatRatification, string> = {
  // JAMAIS « non ratifié » : un « non ratifié » porterait sur le patient un
  // jugement qu'il n'a pas eu l'occasion de démentir (`DC-24` — une absence
  // n'est pas un refus).
  //
  // LE LIBELLÉ A CHANGÉ AU LOT-06, ET LES DEUX FORMULATIONS ÉVIDENTES ÉTAIENT
  // FAUSSES — chacune dans une position du drapeau.
  //
  // « Pas encore proposé au patient » (LOT-02) devient faux dès que l'écran
  // portail est ouvert : l'objectif EST proposé. « Le patient ne s'est pas
  // encore prononcé » est faux tant qu'il est éteint : le patient n'a jamais pu
  // se prononcer, et présenter une absence de DISPOSITIF comme un silence de
  // personne est exactement ce que `DC-24` interdit. Le drapeau restera éteint
  // jusqu'à un geste du responsable, donc la fenêtre n'est pas théorique.
  //
  // Le libellé retenu ne dit que ce que le cockpit SAIT — il n'y a pas de ligne
  // de ratification — sans rien affirmer ni de l'offre, ni du patient. Faire
  // remonter l'état du drapeau par la route praticien aurait marché aussi ;
  // c'est une dépendance de plus pour dire moins.
  en_attente: 'Aucune réponse du patient enregistrée',
  ratifie: 'Ratifié par le patient',
  conteste: 'Contesté par le patient',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Une ligne d'objectif, telle qu'elle se lit — version courante ou antérieure. */
function LigneObjectif({ ligne }: { ligne: ObjectifExpose }) {
  return (
    <div className="text-base text-foreground">
      <p className="whitespace-pre-wrap">« {ligne.enoncePatient} »</p>
      {ligne.reformulationPraticien && (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          Reformulation : {ligne.reformulationPraticien}
        </p>
      )}
      {ligne.priorite && <p className="mt-1 text-sm text-muted-foreground">Priorité : {ligne.priorite}</p>}
      {ligne.nonTraiteMotif && ligne.nonTraiteDepuisLe && (
        <p className="mt-1 text-sm text-muted-foreground">
          Non traité pour l’instant depuis le {formatDate(ligne.nonTraiteDepuisLe)} — {ligne.nonTraiteMotif}
        </p>
      )}
      {/* LE DIFF PROPOSÉ↔NÉGOCIÉ, ET IL TIENT EN UNE LIGNE (Alliance 6.0-B,
          LOT-03). Ce qu'il rend observable n'est pas un écart de texte —
          l'énoncé est recopié du fragment, il ne peut pas différer — mais un
          fait sur l'AUTEUR : cet objectif a-t-il été rédigé par le praticien,
          ou repris de ce que la machine avait cité ? C'est le matériau du
          bilan LOT-06, et sans ce marquage il serait invisible.

          AUCUN COMPTEUR, aucun taux : l'adhésion se constate, elle ne se
          compte pas. */}
      {ligne.sourcePropositionId && (
        <p className="mt-1 text-xs text-muted-foreground">
          Repris d’une proposition citée — la reformulation et la priorité ci-dessus sont les vôtres.
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Enregistré le {formatDate(ligne.creeLe)}
        {ligne.negocieLe ? ` · négocié le ${formatDate(ligne.negocieLe)}` : ''}
      </p>
    </div>
  );
}

/**
 * Compteur de longueur. Il REMPLACE `maxLength`, il ne le double pas : un
 * attribut `maxLength` coupe un collage trop long sans le dire, ce qui est la
 * troncature même que ce lot refuse côté serveur. Ici le dépassement est
 * visible, la saisie reste intacte, et c'est la route qui tranche (400).
 */
function Compteur({ valeur, maximum }: { valeur: string; maximum: number }) {
  const depasse = valeur.length > maximum;
  return (
    <p
      className={`mt-1 text-xs ${depasse ? 'text-status-warning' : 'text-muted-foreground'}`}
      aria-live="polite"
    >
      {valeur.length.toLocaleString('fr-FR')} / {maximum.toLocaleString('fr-FR')} caractères
      {depasse ? ' — trop long, l’enregistrement sera refusé.' : ''}
    </p>
  );
}

export function ObjectifNegociePanel({
  idPatient,
  signalAssemblage = 0,
}: {
  idPatient: string;
  /**
   * Change à chaque fois que la section clinique vient de demander un
   * assemblage (Alliance 6.0-B, LOT-03). Ce panneau est autonome et ne voit
   * jamais le runtime clinique : sans ce signal, il lirait la table AVANT que
   * l'assemblage y ait écrit et n'afficherait rien jusqu'au rechargement.
   */
  signalAssemblage?: number;
}) {
  const [etat, setEtat] = useState<EtatDossier>('chargement');
  const [erreur, setErreur] = useState('');
  const [objectifs, setObjectifs] = useState<ObjectifExpose[]>([]);
  const [trajectoires, setTrajectoires] = useState<TrajectoireObjectif[]>([]);
  const [ancrage, setAncrage] = useState<AncrageAnamnese>(ANCRAGE_VIDE);
  const [ratifications, setRatifications] = useState<Record<string, EtatRatification>>({});

  const [reformuleId, setReformuleId] = useState<string | null>(null);
  const [enonce, setEnonce] = useState('');
  const [reformulation, setReformulation] = useState('');
  const [priorite, setPriorite] = useState('');
  const [negocieLe, setNegocieLe] = useState('');
  const [nonTraiteMotif, setNonTraiteMotif] = useState('');
  const [nonTraiteDepuisLe, setNonTraiteDepuisLe] = useState('');
  const [etatEnvoi, setEtatEnvoi] = useState<EtatEnvoi>('repos');
  const [erreurEnvoi, setErreurEnvoi] = useState('');

  // ── Les propositions (Alliance 6.0-B, LOT-03) ────────────────────────────
  const [etatPropositions, setEtatPropositions] = useState<EtatPropositions>('chargement');
  const [propositions, setPropositions] = useState<PropositionExposee[]>([]);
  const [disposees, setDisposees] = useState<PropositionExposee[]>([]);
  const [caduques, setCaduques] = useState<PropositionExposee[]>([]);
  /** La citation retenue : quelle proposition, quel fragment, et son texte. */
  const [repriseDe, setRepriseDe] = useState<
    { idProposition: string; index: number; texte: string; source: SourceLue } | null
  >(null);
  const [ecarteDe, setEcarteDe] = useState<string | null>(null);
  const [motifEcart, setMotifEcart] = useState('');
  const [erreurGeste, setErreurGeste] = useState('');

  // DÉPENDANCE STABLE. `chargerDossier` ne dépend que de `idPatient` ; un
  // littéral recréé au rendu ferait retirer le GET en boucle, et ce GET
  // JOURNALISE l'accès au dossier (G-TRUST-04) — le journal se remplirait de
  // lignes que personne n'a demandées (cicatrice `ClinicalRuntimeSection.tsx:80-81`).
  const chargerDossier = useCallback(async () => {
    setEtat('chargement');
    setErreur('');
    try {
      const reponse = await fetch(`/api/praticien/objectifs?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as ObjectifsApiResponse;
      if (!reponse.ok || !payload.ok || !('objectifs' in payload)) {
        setErreur(
          ('error' in payload && payload.error) || 'Les objectifs n’ont pas pu être chargés.',
        );
        setEtat('erreur');
        return;
      }
      setObjectifs(payload.objectifs);
      setTrajectoires(payload.trajectoires);
      setAncrage(payload.ancrage);
      setRatifications(payload.ratifications);
      setEtat('chargee');
    } catch {
      setErreur('Les objectifs n’ont pas pu être chargés.');
      setEtat('erreur');
    }
  }, [idPatient]);

  const chargerPropositions = useCallback(async () => {
    setErreurGeste('');
    try {
      const reponse = await fetch(
        `/api/praticien/propositions-objectif?idPatient=${encodeURIComponent(idPatient)}`,
      );
      // 503 = drapeau éteint ou dossier hors du périmètre de repli. Le bloc est
      // alors ABSENT, pas vide : « aucune proposition » se lirait comme un
      // constat sur ce patient, alors que la fonctionnalité n'est pas ouverte.
      if (reponse.status === 503) {
        setEtatPropositions('fermee');
        return;
      }
      const payload = (await reponse.json()) as PropositionsApiResponse;
      if (!reponse.ok || !payload.ok || !('propositions' in payload)) {
        setEtatPropositions('erreur');
        return;
      }
      setPropositions(payload.propositions);
      setDisposees(payload.disposees);
      setCaduques(payload.caduques);
      setEtatPropositions('ouverte');
    } catch {
      setEtatPropositions('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void chargerDossier();
  }, [chargerDossier]);

  // `signalAssemblage` en dépendance : le compteur change quand la section
  // clinique vient d'assembler, et cette relecture est le seul moment où une
  // proposition fraîche peut apparaître sans rechargement de page.
  useEffect(() => {
    void chargerPropositions();
  }, [chargerPropositions, signalAssemblage]);

  const enregistrer = useCallback(async () => {
    if (!reformuleId && !repriseDe && enonce.trim().length === 0) return;
    setEtatEnvoi('envoi');
    setErreurEnvoi('');
    try {
      const charge: Record<string, string | number | null> = {
        idPatient,
        reformulationPraticien: reformulation,
        priorite,
        negocieLe: negocieLe || '',
        nonTraiteMotif,
        nonTraiteDepuisLe: nonTraiteDepuisLe || '',
        supersedesObjectifId: reformuleId,
      };
      // NI POUR UNE RÉVISION, NI POUR UNE REPRISE l'énoncé n'est transmis : le
      // serveur le RECOPIE — de la version visée dans un cas, du fragment cité
      // dans l'autre. L'écran ne peut donc pas, même par erreur, réécrire les
      // mots du patient. Il DÉSIGNE, il ne dicte pas.
      if (repriseDe) {
        charge.sourcePropositionId = repriseDe.idProposition;
        charge.sourceFragmentIndex = repriseDe.index;
      } else if (!reformuleId) {
        charge.enoncePatient = enonce;
      }

      const reponse = await fetch('/api/praticien/objectifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charge),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreurEnvoi(payload.error ?? 'L’objectif n’a pas pu être enregistré.');
        setEtatEnvoi('erreur');
        return;
      }
      setEnonce('');
      setReformulation('');
      setPriorite('');
      setNegocieLe('');
      setNonTraiteMotif('');
      setNonTraiteDepuisLe('');
      setReformuleId(null);
      setRepriseDe(null);
      setEtatEnvoi('repos');
      // Les deux lectures, et dans cet ordre : une reprise a posé un geste sur
      // la proposition, qui cesse donc d'être servie comme vivante.
      await chargerDossier();
      await chargerPropositions();
    } catch {
      setErreurEnvoi('L’objectif n’a pas pu être enregistré.');
      setEtatEnvoi('erreur');
    }
  }, [
    idPatient,
    reformuleId,
    repriseDe,
    chargerPropositions,
    enonce,
    reformulation,
    priorite,
    negocieLe,
    nonTraiteMotif,
    nonTraiteDepuisLe,
    chargerDossier,
  ]);

  const ecarter = useCallback(async () => {
    if (!ecarteDe) return;
    setErreurGeste('');
    try {
      const reponse = await fetch('/api/praticien/propositions-objectif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ecarter',
          idPatient,
          idProposition: ecarteDe,
          motif: motifEcart,
        }),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        // Le refus du serveur est affiché TEL QUEL : c'est lui qui fait foi
        // (motif absent, proposition déjà disposée, dossier clos).
        setErreurGeste(payload.error ?? 'La proposition n’a pas pu être écartée.');
        return;
      }
      setEcarteDe(null);
      setMotifEcart('');
      await chargerPropositions();
    } catch {
      setErreurGeste('La proposition n’a pas pu être écartée.');
    }
  }, [ecarteDe, idPatient, motifEcart, chargerPropositions]);

  return (
    <section aria-labelledby="objectif-negocie" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="objectif-negocie" className="text-sm font-semibold text-foreground">
        Objectif négocié
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ce que le patient demande, dans ses mots, et ce que vous en avez compris. Chaque révision s’ajoute :
        rien n’est écrasé, rien n’est supprimé.
      </p>

      {etat === 'chargement' && (
        <p role="status" className="mt-3 text-base text-muted-foreground">
          Chargement des objectifs&hellip;
        </p>
      )}

      {etat === 'erreur' && (
        // ABSENCE N° 3 — une erreur de lecture n'est JAMAIS présentée comme
        // « aucun objectif » : ce serait une affirmation fausse sur le dossier,
        // et elle ferait recommencer une négociation déjà posée.
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-lg border border-accent bg-status-warning/10 p-3 text-base text-status-warning"
        >
          <span>{erreur} Ce n’est pas une absence d’objectif : la lecture a échoué.</span>
          <button
            type="button"
            onClick={() => void chargerDossier()}
            className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Réessayer
          </button>
        </div>
      )}

      {etat === 'chargee' && (
        <div className="mt-3 flex flex-col gap-4">
          {/* MATÉRIAU D'ANCRAGE — À CÔTÉ DE LA SAISIE, JAMAIS DEDANS.
              Pré-remplir l'énoncé avec une phrase d'anamnèse attribuerait
              durablement au patient, comme objectif négocié, quelque chose
              qu'il a dit dans un autre contexte et à une autre question. Le
              praticien le lit, le reprend s'il le veut, mais c'est un geste,
              pas un défaut. */}
          <aside
            aria-label="Matériau d’anamnèse"
            className="rounded-lg border border-border bg-surface p-3"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ce que le patient a écrit à l’anamnèse
            </h4>
            {!ancrage.consultationValidee ? (
              // ABSENCE N° 1 — il n'y a pas de consultation validée : il n'y a
              // donc pas de matériau, ce qui ne se dit pas comme « champ vide ».
              <p className="mt-2 text-base text-muted-foreground">
                Aucune consultation validée dans ce dossier : l’anamnèse n’a pas encore de matériau à reprendre.
              </p>
            ) : (
              <dl className="mt-2 flex flex-col gap-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Motif principal</dt>
                  {/* ABSENCE N° 2 — la consultation existe, le champ est vide. */}
                  <dd className="text-base text-foreground">
                    {ancrage.motifPrincipal ?? 'Non renseigné à l’anamnèse.'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Objectif prioritaire déclaré</dt>
                  <dd className="text-base text-foreground">
                    {ancrage.objectifPrioritaire ?? 'Non renseigné à l’anamnèse.'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Attentes principales</dt>
                  <dd className="text-base text-foreground">
                    {ancrage.attentes.length > 0
                      ? ancrage.attentes.join(', ')
                      : 'Non renseignées à l’anamnèse.'}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Déclarations recueillies à l’anamnèse, dans un autre contexte que cet entretien : matériau de
              départ, jamais un objectif négocié. Rien n’est recopié automatiquement dans la saisie.
            </p>
          </aside>

          {/* PROPOSITIONS D'OBJECTIF (Alliance 6.0-B, LOT-03).

              LE BLOC EST ABSENT quand la fonctionnalité est fermée — pas vide.
              Une liste vide se lirait « la machine n'a rien trouvé à proposer
              sur ce dossier », c'est-à-dire un constat sur le patient, là où la
              vérité est que personne n'a ouvert la fonctionnalité (`DC-24`). */}
          {etatPropositions !== 'fermee' && etatPropositions !== 'chargement' && (
            <aside
              aria-label="Propositions d’objectif"
              className="rounded-lg border border-border bg-surface p-3"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ce que Wellneuro peut citer
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Des assemblages de phrases déjà écrites — par le patient, par un instrument certifié, par une
                règle signée. Rien n’est rédigé ici : chaque phrase porte sa provenance.
              </p>

              {etatPropositions === 'erreur' && (
                <div
                  role="alert"
                  className="mt-3 flex flex-col gap-2 rounded-lg border border-accent bg-status-warning/10 p-3 text-base text-status-warning"
                >
                  <span>
                    Les propositions n’ont pas pu être lues. Ce n’est pas une absence de proposition : la
                    lecture a échoué.
                  </span>
                  <button
                    type="button"
                    onClick={() => void chargerPropositions()}
                    className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {erreurGeste && (
                <p role="alert" className="mt-3 text-base text-status-warning">
                  {erreurGeste}
                </p>
              )}

              {etatPropositions === 'ouverte' && propositions.length === 0 && (
                // OUVERTE ET SANS LIGNE : là, le dire est juste — et le motif
                // est nommé, parce qu'« aucune proposition » sans raison se
                // lirait comme un jugement sur le dossier.
                <p className="mt-3 text-base text-muted-foreground">
                  Aucune proposition vivante. Wellneuro n’en assemble qu’à partir de candidats signés, après la
                  confirmation d’un épisode : sans épisode confirmé, il n’a rien de signé à citer.
                </p>
              )}

              {propositions.map((proposition) => (
                <article
                  key={proposition.id}
                  className="mt-3 rounded-lg border border-border bg-surface-2 p-3"
                >
                  <ul className="flex flex-col gap-2">
                    {proposition.fragments.map((fragment, index) => (
                      <FragmentCite
                        key={`${proposition.id}-${index}`}
                        fragment={fragment}
                        choisi={repriseDe?.idProposition === proposition.id && repriseDe.index === index}
                        onReprendre={
                          // « Reprendre cette phrase » n'est offert que sur un
                          // verbatim d'anamnèse : `enoncePatient` ne se
                          // pré-remplit que par citation de ce que le PATIENT a
                          // écrit ([[D-094]]). Le serveur refuse les autres
                          // (422) ; l'écran ne propose pas un geste refusé.
                          lireSource(fragment.source)?.nature === 'anamnese'
                            ? () => {
                                setRepriseDe({
                                  idProposition: proposition.id,
                                  index,
                                  texte: fragment.texte,
                                  source: lireSource(fragment.source),
                                });
                                setReformuleId(null);
                                setEnonce('');
                                setErreurEnvoi('');
                              }
                            : undefined
                        }
                      />
                    ))}
                  </ul>

                  {ecarteDe === proposition.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="text-sm text-muted-foreground" htmlFor={`motif-${proposition.id}`}>
                        Pourquoi cette proposition ne convient pas — c’est ce motif qui dira, plus tard, si le
                        classement des candidats mérite d’être signé.
                      </label>
                      <textarea
                        id={`motif-${proposition.id}`}
                        value={motifEcart}
                        onChange={(evenement) => setMotifEcart(evenement.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      />
                      <Compteur valeur={motifEcart} maximum={LONGUEUR_MAX_MOTIF_ECART} />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void ecarter()}
                          className="min-h-9 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          Écarter avec ce motif
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcarteDe(null);
                            setMotifEcart('');
                            setErreurGeste('');
                          }}
                          className="min-h-9 rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEcarteDe(proposition.id);
                        setMotifEcart('');
                        setErreurGeste('');
                      }}
                      className="mt-3 min-h-9 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      Écarter cette proposition
                    </button>
                  )}
                </article>
              ))}

              {disposees.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Déjà tranchées
                  </h5>
                  <ul className="mt-2 flex flex-col gap-2">
                    {disposees.map((proposition) => (
                      <li key={proposition.id} className="text-sm text-muted-foreground">
                        {proposition.disposition === 'reprise' ? 'Reprise' : 'Écartée'} —{' '}
                        {proposition.fragments[0]?.texte ?? 'proposition sans citation lisible'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {caduques.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Périmées
                  </h5>
                  {/* CADUQUE N'EST PAS « REFUSÉE ». Personne ne les a écartées :
                      les données sources ont changé depuis, et une citation
                      tirée d'un état du dossier qui n'est plus le sien ne se
                      reprend pas. */}
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les données du dossier ont changé depuis leur assemblage : elles restent lisibles, elles ne
                    se reprennent plus.
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {caduques.map((proposition) => (
                      <li key={proposition.id} className="text-sm text-muted-foreground">
                        {proposition.fragments[0]?.texte ?? 'proposition sans citation lisible'}
                        {proposition.assembleeLe
                          ? ` — assemblée le ${formatDate(proposition.assembleeLe)}`
                          : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          )}

          {objectifs.length === 0 && (
            <p className="text-base text-muted-foreground">Aucun objectif négocié pour ce dossier.</p>
          )}

          {objectifs.length > 1 && (
            // On n'en garde PAS un seul : deux reformulations concurrentes ont
            // créé deux versions courantes, et départager en silence ferait
            // disparaître le travail de l'une des deux (`DC-30`).
            <p role="status" className="text-sm text-status-warning">
              {objectifs.length} versions courantes coexistent pour ce dossier — deux reformulations ont été
              enregistrées en parallèle. Elles sont toutes affichées ; aucune n’est écartée.
            </p>
          )}

          {trajectoires.map((trajectoire) => {
            const [courante, ...anterieures] = trajectoire.lignes;
            if (!courante) return null;
            return (
              <article
                key={trajectoire.idObjectif}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Version courante · {LIBELLE_RATIFICATION[ratifications[trajectoire.idObjectif] ?? 'en_attente']}
                </p>
                <div className="mt-1">
                  <LigneObjectif ligne={courante} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReformuleId(trajectoire.idObjectif);
                    // Les champs PRATICIEN de la version révisée sont repris :
                    // sans cela, ne toucher qu'à la reformulation ferait
                    // retomber `priorite` et « non traité » à vide sur la
                    // nouvelle tête — la version courante perdrait en silence
                    // ce qu'elle portait. L'ÉNONCÉ DU PATIENT, lui, n'est pas
                    // repris ici : il est recopié côté serveur depuis la ligne
                    // visée, jamais réécrit depuis l'écran.
                    setReformulation(courante.reformulationPraticien ?? '');
                    setPriorite(courante.priorite ?? '');
                    setNonTraiteMotif(courante.nonTraiteMotif ?? '');
                    setNonTraiteDepuisLe(
                      courante.nonTraiteDepuisLe ? courante.nonTraiteDepuisLe.slice(0, 10) : '',
                    );
                  }}
                  className="mt-2 min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Reformuler cette version
                </button>

                {anterieures.length > 0 && (
                  <div className="mt-3 border-t border-border pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">
                      Versions antérieures ({anterieures.length})
                    </h5>
                    <ol className="mt-2 flex flex-col gap-3">
                      {anterieures.map((ligne) => (
                        <li key={ligne.id} className="opacity-80">
                          <LigneObjectif ligne={ligne} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}

          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold text-foreground">
              {reformuleId
                ? 'Reformuler l’objectif'
                : repriseDe
                  ? 'Reprendre une proposition'
                  : 'Poser un objectif négocié'}
            </h4>

            {repriseDe ? (
              // LA CITATION S'AFFICHE, ELLE NE S'ÉDITE PAS — et ce n'est pas
              // une commodité d'écran. Le serveur la RECOPIE du fragment
              // désigné ; un champ modifiable laisserait croire au praticien
              // qu'il peut l'amender, alors que sa saisie serait ignorée. Ce
              // qui lui appartient — la reformulation, la priorité — reste
              // libre juste en dessous.
              <div className="mt-2 rounded-lg border border-accent bg-surface-2 p-3">
                <p className="whitespace-pre-wrap text-base text-foreground">« {repriseDe.texte} »</p>
                <Provenance source={repriseDe.source} />
                <p className="mt-2 text-sm text-muted-foreground">
                  Cette phrase devient l’énoncé du patient telle quelle : Wellneuro cite, il ne rédige pas.{' '}
                  <button
                    type="button"
                    onClick={() => setRepriseDe(null)}
                    className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    Écrire un énoncé à la place
                  </button>
                </p>
              </div>
            ) : reformuleId ? (
              <p className="mt-2 text-sm text-muted-foreground">
                L’énoncé du patient est repris tel quel de la version précédente : il ne se réécrit pas.{' '}
                <button
                  type="button"
                  onClick={() => setReformuleId(null)}
                  className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Poser un nouvel objectif à la place
                </button>
              </p>
            ) : (
              <>
                <label htmlFor="objectif-enonce" className="mt-2 block text-xs font-medium text-foreground">
                  Ce que le patient demande, dans ses mots
                </label>
                <textarea
                  id="objectif-enonce"
                  value={enonce}
                  onChange={(evenement) => setEnonce(evenement.target.value)}
                  rows={3}
                  placeholder="« Je voudrais dormir sans me réveiller à trois heures. »"
                  className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <Compteur valeur={enonce} maximum={LONGUEUR_MAX_ENONCE} />
              </>
            )}

            <label htmlFor="objectif-reformulation" className="mt-3 block text-xs font-medium text-foreground">
              Votre reformulation (facultative)
            </label>
            <textarea
              id="objectif-reformulation"
              value={reformulation}
              onChange={(evenement) => setReformulation(evenement.target.value)}
              rows={3}
              placeholder="Ce que vous avez compris de la demande…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <Compteur valeur={reformulation} maximum={LONGUEUR_MAX_REFORMULATION} />

            {/* CHAMP TEXTE LIBRE, jamais une liste déroulante ni un badge
                ordonné : une liste fermée serait un rang, et un rang serait un
                score (`schema.prisma:1955-1957`). */}
            <label htmlFor="objectif-priorite" className="mt-3 block text-xs font-medium text-foreground">
              Priorité (libellé libre)
            </label>
            <input
              id="objectif-priorite"
              type="text"
              value={priorite}
              onChange={(evenement) => setPriorite(evenement.target.value)}
              placeholder="Ce sur quoi on travaille d’abord…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <Compteur valeur={priorite} maximum={LONGUEUR_MAX_PRIORITE} />

            <label htmlFor="objectif-negocie-le" className="mt-3 block text-xs font-medium text-foreground">
              Date de l’accord (facultative)
            </label>
            <input
              id="objectif-negocie-le"
              type="date"
              value={negocieLe}
              onChange={(evenement) => setNegocieLe(evenement.target.value)}
              className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />

            <fieldset className="mt-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-foreground">
                Non traité pour l’instant (motif et date vont ensemble)
              </legend>

              <label htmlFor="objectif-non-traite-motif" className="mt-1 block text-xs font-medium text-foreground">
                Ce qui n’est pas traité, et pourquoi
              </label>
              <textarea
                id="objectif-non-traite-motif"
                value={nonTraiteMotif}
                onChange={(evenement) => setNonTraiteMotif(evenement.target.value)}
                rows={2}
                placeholder="Ce qui est assumé de côté pour le moment…"
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <Compteur valeur={nonTraiteMotif} maximum={LONGUEUR_MAX_MOTIF} />

              <label htmlFor="objectif-non-traite-depuis" className="mt-2 block text-xs font-medium text-foreground">
                Depuis le
              </label>
              <input
                id="objectif-non-traite-depuis"
                type="date"
                value={nonTraiteDepuisLe}
                onChange={(evenement) => setNonTraiteDepuisLe(evenement.target.value)}
                className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </fieldset>

            {etatEnvoi === 'erreur' && (
              <p role="alert" className="mt-2 text-base text-foreground">
                {erreurEnvoi}
              </p>
            )}

            {/* La date d'enregistrement est posée par la BASE : aucun champ de
                date d'écriture n'existe ici, et c'est délibéré. */}
            <button
              type="button"
              onClick={() => void enregistrer()}
              disabled={
                (!reformuleId && !repriseDe && enonce.trim().length === 0) || etatEnvoi === 'envoi'
              }
              className="mt-3 min-h-11 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {etatEnvoi === 'envoi'
                ? 'Enregistrement…'
                : reformuleId
                  ? 'Enregistrer la reformulation'
                  : 'Enregistrer l’objectif'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
