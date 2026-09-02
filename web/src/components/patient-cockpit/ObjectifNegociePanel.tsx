'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AmendementExpose,
  AncrageAnamnese,
  ObjectifExpose,
  ObjectifsApiResponse,
  ReponseJalonExposee,
  TrajectoireObjectif,
} from '@/app/api/praticien/objectifs/route';
// La borne haute de l'échelle vient du module PUR, jamais recopiée : « sur 10 »
// écrit en dur ici mentirait le jour où la borne bouge côté serveur.
import { EVA_MAX } from '@/lib/praticien/objectifNegocie';
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
 * LE RÉSUMÉ D'UNE PROPOSITION DÉJÀ TRANCHÉE OU PÉRIMÉE — avec sa provenance.
 *
 * IL AFFICHAIT UNE PHRASE NUE, ET C'ÉTAIT LA FAUTE QUE LA CAMPAGNE INTERDIT
 * (relevé en revue). Le premier fragment d'un assemblage est TOUJOURS celui de
 * la règle signée (`assemblageProposition.ts`), tandis qu'une reprise porte
 * toujours sur un fragment d'anamnèse : « Reprise — Explorer le sommeil »
 * présentait donc au praticien, comme ce qu'il avait repris, une phrase que la
 * MACHINE avait produite — et sans sa source. Une provenance ne s'omet jamais,
 * pas même dans un résumé.
 */
function ResumeProposition({
  prefixe,
  proposition,
}: {
  prefixe?: string;
  proposition: PropositionExposee;
}) {
  const premier = proposition.fragments[0];
  if (!premier) {
    // Une proposition dont aucun fragment n'est lisible ne se résume pas par
    // une phrase inventée pour l'occasion.
    return (
      <li className="text-sm text-muted-foreground">
        {prefixe ? `${prefixe} — ` : ''}proposition sans citation lisible
      </li>
    );
  }
  return (
    <li className="border-l-2 border-border pl-3">
      <p className="text-sm text-foreground">
        {prefixe ? <span className="font-medium">{prefixe} — </span> : null}« {premier.texte} »
      </p>
      <Provenance source={lireSource(premier.source)} />
    </li>
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
          // `aria-pressed` DEMANDE UN VRAI BASCULEMENT : le second clic
          // dépresse, et c'est `onReprendre` qui le porte. Annoncer un
          // interrupteur qui ne se relève pas — sous deux noms successifs —
          // trompait le lecteur d'écran (relevé en revue).
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
  // NI « refusé », NI « contesté » : le patient n'a pas dit non, il a écrit sa
  // version — et ce libellé dit au praticien qu'il y a un TEXTE à lire, pas un
  // verdict à encaisser (Alliance 6.0-B, LOT-04, `D-110`).
  dit_autrement: 'Le patient l’a dit autrement — son texte ci-dessous',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Une ligne d'objectif, telle qu'elle se lit — version courante ou antérieure.
 *
 * DEUX VOIX NOMMÉES, PAS UNE CITATION SUIVIE D'UNE NOTE : le patient et le
 * praticien avaient déjà chacun leur texte ; ce qui manquait était le label
 * qui les distingue au premier coup d'œil, sans quoi la reformulation se
 * lisait comme un commentaire secondaire noyé dans le gris (relevé par le
 * praticien : la carte paraissait « grisée et vierge, comme non validée »).
 *
 * `ratificationLibelle` est OPTIONNEL et n'est passé que pour la version
 * COURANTE de chaque chaîne : une version antérieure n'a pas de statut de
 * ratification qui lui soit propre, l'affirmer serait un fait inventé.
 */
function LigneObjectif({
  ligne,
  ratificationLibelle,
}: {
  ligne: ObjectifExpose;
  ratificationLibelle?: string;
}) {
  return (
    <div className="text-base text-foreground">
      <div className="rounded-lg border border-accent/50 bg-surface-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Le patient</p>
        <p className="mt-1 whitespace-pre-wrap">« {ligne.enoncePatient} »</p>
      </div>
      {ligne.reformulationPraticien && (
        <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Le praticien a compris
          </p>
          <p className="mt-1 whitespace-pre-wrap">{ligne.reformulationPraticien}</p>
        </div>
      )}
      {ligne.priorite && <p className="mt-2 text-sm text-muted-foreground">Priorité : {ligne.priorite}</p>}
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
      {/* LA SIGNATURE : date d'enregistrement, date de l'accord, et — pour la
          seule version courante — l'état de ratification, réunis en un seul
          pied de carte plutôt que dispersés entre l'en-tête de l'article et
          le bas de la ligne. C'est ce pied qui doit lire comme un
          enregistrement daté et signé, pas comme une note technique. */}
      <p className="mt-2 text-xs font-medium text-foreground">
        Enregistré le {formatDate(ligne.creeLe)}
        {ligne.negocieLe ? ` · négocié le ${formatDate(ligne.negocieLe)}` : ''}
        {ratificationLibelle ? ` — ${ratificationLibelle}` : ''}
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
  /** Ce que le patient a écrit lui-même (« le dire autrement », 6.0-B LOT-04).
   *  Tous gestes du dossier : l'écran les range sous leur version. */
  const [amendements, setAmendements] = useState<AmendementExpose[]>([]);
  const [reponsesJalon, setReponsesJalon] = useState<ReponseJalonExposee[]>([]);

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
  /** Le texte du patient que la prochaine version va reprendre comme énoncé,
   *  ou `null`. Comme pour un fragment : l'écran DÉSIGNE, le serveur recopie —
   *  seul l'identifiant part, jamais le texte. */
  const [citeAmendement, setCiteAmendement] = useState<AmendementExpose | null>(null);
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
      setAmendements(payload.amendements);
      setReponsesJalon(payload.reponsesJalon);
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
        // LA LISTE PÉRIMÉE NE RESTE PAS À L'ÉCRAN (relevé en revue). Une
        // relecture en échec — celle qui suit un écart réussi, par exemple —
        // laissait l'alerte « la lecture a échoué » COEXISTER avec des boutons
        // « Reprendre » et « Écarter » actifs sur une proposition déjà tranchée.
        setEtatPropositions('erreur');
        setPropositions([]);
        setDisposees([]);
        setCaduques([]);
        return;
      }
      setPropositions(payload.propositions);
      setDisposees(payload.disposees);
      setCaduques(payload.caduques);
      setEtatPropositions('ouverte');
    } catch {
      setEtatPropositions('erreur');
      setPropositions([]);
      setDisposees([]);
      setCaduques([]);
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
    if (!reformuleId && !repriseDe && !citeAmendement && enonce.trim().length === 0) return;
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
      } else if (citeAmendement) {
        // TROISIÈME CAS, MÊME RÈGLE : seul l'identifiant part. Le serveur
        // recopie le texte depuis `amendements_objectif` et vérifie qu'il porte
        // bien sur la chaîne reformulée.
        charge.amendementCiteId = citeAmendement.id;
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
      setCiteAmendement(null);
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
    citeAmendement,
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
      // Écarter la proposition dont une citation était retenue relâche cette
      // sélection : sans cela, l'enregistrement partait vers un `409` juste
      // mais parfaitement évitable.
      if (repriseDe?.idProposition === ecarteDe) setRepriseDe(null);
      await chargerPropositions();
    } catch {
      setErreurGeste('La proposition n’a pas pu être écartée.');
    }
  }, [ecarteDe, idPatient, motifEcart, repriseDe, chargerPropositions]);

  // LE FORMULAIRE NE S'OUVRE QUE SUR UN GESTE, PAS PAR DÉFAUT — dès qu'un
  // objectif courant existe. Sans dossier (`objectifs.length === 0`), il n'y a
  // rien à lire : la saisie reste la première chose visible, comme avant. Avec
  // un dossier, seul un déclencheur explicite (reformuler, reprendre une
  // proposition, citer un amendement — les trois états déjà posés par les
  // boutons des cartes) rouvre le formulaire ; sinon la carte validée reste
  // seule à l'écran, sans un formulaire vide en dessous qui la fait passer
  // pour un brouillon.
  const editionOuverte =
    objectifs.length === 0 || reformuleId !== null || repriseDe !== null || citeAmendement !== null;

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
                                const dejaChoisi =
                                  repriseDe?.idProposition === proposition.id
                                  && repriseDe.index === index;
                                // Un second clic REND la citation : le bouton
                                // annonce `aria-pressed`, il doit se relever.
                                setRepriseDe(
                                  dejaChoisi
                                    ? null
                                    : {
                                        idProposition: proposition.id,
                                        index,
                                        texte: fragment.texte,
                                        source: lireSource(fragment.source),
                                      },
                                );
                                setReformuleId(null);
                                // NETTOYAGE SYMÉTRIQUE (leçon du LOT-03) : les
                                // trois origines d'énoncé s'excluent, et
                                // chacune doit relâcher les deux autres — sinon
                                // l'écran affiche un titre et le serveur reçoit
                                // un corps qui en décrit un autre.
                                setCiteAmendement(null);
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
                      <ResumeProposition
                        key={proposition.id}
                        prefixe={proposition.disposition === 'reprise' ? 'Reprise' : 'Écartée'}
                        proposition={proposition}
                      />
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
                      <ResumeProposition
                        key={proposition.id}
                        prefixe={
                          proposition.assembleeLe
                            ? `Assemblée le ${formatDate(proposition.assembleeLe)}`
                            : undefined
                        }
                        proposition={proposition}
                      />
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
                <p className="text-xs font-medium text-muted-foreground">Version courante</p>
                <div className="mt-1">
                  <LigneObjectif
                    ligne={courante}
                    ratificationLibelle={
                      LIBELLE_RATIFICATION[ratifications[trajectoire.idObjectif] ?? 'en_attente']
                    }
                  />
                </div>

                {/* ── CE QUE LE PATIENT A ÉCRIT LUI-MÊME (6.0-B, LOT-04) ─────
                    Les amendements de TOUTE la chaîne, pas de la seule version
                    courante : une parole écrite sur `v1` ne cesse pas de
                    concerner cet objectif parce que `v2` s'est intercalée.
                    Aucun décompte, aucun résumé, aucun diff avec l'énoncé : le
                    texte est rendu tel quel. */}
                {(() => {
                  const idsDeLaChaine = new Set(trajectoire.lignes.map((ligne) => ligne.id));
                  const siens = amendements.filter((ligne) => idsDeLaChaine.has(ligne.idObjectif));
                  if (siens.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-accent bg-surface-2 p-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Le patient l’a dit autrement
                      </h5>
                      <ul className="mt-2 flex flex-col gap-3">
                        {siens.map((amendement) => (
                          <li key={amendement.id} className="border-l-2 border-border pl-3">
                            <p className="whitespace-pre-wrap text-base text-foreground">
                              « {amendement.texte} »
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Écrit au portail le {formatDate(amendement.creeLe)}
                            </p>
                            <button
                              type="button"
                              aria-pressed={citeAmendement?.id === amendement.id}
                              onClick={() => {
                                // Second clic : la citation se rend. Le bouton
                                // annonce `aria-pressed`, il doit se relever.
                                if (citeAmendement?.id === amendement.id) {
                                  setCiteAmendement(null);
                                  setReformuleId(null);
                                  return;
                                }
                                // Reprendre les mots du patient REFORMULE la
                                // version courante : sans `reformuleId`, la
                                // nouvelle ligne ouvrirait une seconde tête de
                                // chaîne et le portail refuserait toute réponse.
                                setReformuleId(trajectoire.idObjectif);
                                setCiteAmendement(amendement);
                                setRepriseDe(null);
                                setEnonce('');
                                setErreurEnvoi('');
                                // Les champs PRATICIEN de la version reformulée
                                // sont repris, comme pour « Reformuler » : sans
                                // cela, intégrer le texte du patient ferait
                                // retomber priorité et « non traité » à vide.
                                setReformulation(courante.reformulationPraticien ?? '');
                                setPriorite(courante.priorite ?? '');
                                setNonTraiteMotif(courante.nonTraiteMotif ?? '');
                                setNonTraiteDepuisLe(
                                  courante.nonTraiteDepuisLe
                                    ? courante.nonTraiteDepuisLe.slice(0, 10)
                                    : '',
                                );
                              }}
                              className={`mt-2 min-h-9 rounded-lg px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                citeAmendement?.id === amendement.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'border border-border text-foreground hover:bg-accent/10'
                              }`}
                            >
                              {citeAmendement?.id === amendement.id
                                ? 'Ces mots deviennent l’énoncé'
                                : 'En faire l’énoncé du patient'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* ── OÙ LE PATIENT EN EST (6.0-B, LOT-05, `D-111`) ──────────
                    UN RÉCIT, PAS UNE COURBE. Les réponses arrivent du plus
                    récent au plus ancien et sont rendues dans cet ordre : ni
                    tri par EVA, ni delta d'un jalon à l'autre, ni moyenne, ni
                    couleur de tendance. Le praticien lit ce que son patient a
                    écrit et l'interprète AVEC LUI — le dépôt ne conclut rien à
                    sa place (`D-088`, `D-111` §3).
                    Toute la chaîne, comme les amendements : un récit écrit
                    avant une reformulation est souvent ce qui l'a motivée. */}
                {(() => {
                  const idsDeLaChaine = new Set(trajectoire.lignes.map((ligne) => ligne.id));
                  const etapes = reponsesJalon.filter((ligne) =>
                    idsDeLaChaine.has(ligne.idObjectif),
                  );
                  if (etapes.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Où le patient en était
                      </h5>
                      <ul className="mt-2 flex flex-col gap-3">
                        {etapes.map((etape) => (
                          <li key={etape.id} className="border-l-2 border-border pl-3">
                            <p className="text-xs text-muted-foreground">
                              {etape.jalon} — écrit au portail le {formatDate(etape.creeLe)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-base text-foreground">
                              « {etape.texte} »
                            </p>
                            {/* `!== null` : le zéro d'un patient est une
                                réponse, et une vérité JavaScript l'aurait
                                effacé de l'écran du praticien (`DC-24`).
                                Le libellé dit l'échelle et RIEN DE PLUS —
                                aucune qualification, aucun adjectif : « 3 »
                                n'est ni bas, ni inquiétant, ni en progrès. */}
                            {etape.eva !== null && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Échelle du patient : {etape.eva} sur {EVA_MAX}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

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
                    // REFORMULER ET REPRENDRE S'EXCLUENT, et le nettoyage doit
                    // être SYMÉTRIQUE (relevé en revue) : la reprise effaçait
                    // bien la reformulation, l'inverse était oublié. Les deux
                    // états coexistants donnaient un écran contradictoire — le
                    // titre disait « Reformuler », le corps montrait la citation
                    // — et un corps portant les deux références, que le serveur
                    // refusait avec un message décrivant tout autre chose.
                    setRepriseDe(null);
                    setCiteAmendement(null);
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

          {editionOuverte && (
          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold text-foreground">
              {citeAmendement
                ? 'Intégrer les mots du patient'
                : reformuleId
                  ? 'Reformuler l’objectif'
                  : repriseDe
                    ? 'Reprendre une proposition'
                    : 'Poser un objectif négocié'}
            </h4>

            {citeAmendement ? (
              // LES MOTS DU PATIENT S'AFFICHENT, ILS NE S'ÉDITENT PAS — même
              // règle que pour un fragment cité, et elle pèse plus lourd ici :
              // un champ modifiable inviterait le praticien à « améliorer » la
              // phrase du patient, et la nouvelle version porterait sous
              // l'étiquette « ce que le patient demande » un texte retouché.
              <div className="mt-2 rounded-lg border border-accent bg-surface-2 p-3">
                <p className="whitespace-pre-wrap text-base text-foreground">
                  « {citeAmendement.texte} »
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Écrit par le patient au portail le {formatDate(citeAmendement.creeLe)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ce texte devient l’énoncé de la nouvelle version, mot pour mot. La version
                  précédente reste lisible : rien n’est écrasé.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setCiteAmendement(null);
                      setReformuleId(null);
                    }}
                    className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    Ne pas l’intégrer
                  </button>
                </p>
              </div>
            ) : repriseDe ? (
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
                  Annuler la reformulation
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
                (!reformuleId && !repriseDe && !citeAmendement && enonce.trim().length === 0)
                || etatEnvoi === 'envoi'
              }
              className="mt-3 min-h-11 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {etatEnvoi === 'envoi'
                ? 'Enregistrement…'
                : citeAmendement
                  ? 'Enregistrer avec les mots du patient'
                  : reformuleId
                    ? 'Enregistrer la reformulation'
                    : 'Enregistrer l’objectif'}
            </button>
          </div>
          )}
        </div>
      )}
    </section>
  );
}
