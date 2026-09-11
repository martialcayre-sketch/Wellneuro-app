'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AmendementExpose,
  AncrageAnamnese,
  ObjectifExpose,
  ObjectifsApiResponse,
  ReponseJalonExposee,
  TrajectoireObjectif,
  LigneRatificationExposee,
} from '@/app/api/praticien/objectifs/route';
import type { FenetreJalonObjectif } from '@/lib/protocol/jalonObjectifDu';
import type { LectureFin } from '@/lib/praticien/objectifNegocie';
// La borne haute de l'échelle vient du module PUR, jamais recopiée : « sur 10 »
// écrit en dur ici mentirait le jour où la borne bouge côté serveur.
import { EVA_MAX } from '@/lib/praticien/objectifNegocie';
import type {
  MatiereCitable,
  PropositionApiResponse,
} from '@/app/api/praticien/objectifs/proposition-priorite/route';
import type {
  FragmentExpose,
  PourquoiVide,
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
 *
 * DEPUIS L'AUDIT DU 2026-09-02, le SHA vit dans un repli natif `<details>` :
 * la ligne visible nomme la règle, l'empreinte complète s'ouvre au clic. Le
 * texte reste ENTIER et DANS LE DOM replié (un `<details>` fermé ne démonte
 * pas ses enfants — les bancs qui exigent les 64 caractères passent tels
 * quels) : c'est la mise en scène qui change, jamais la provenance — la
 * distinction que l'audit doctrine a établie comme libre.
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
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer">Règle signée {source.regle} — voir le périmètre signé</summary>
      <p className="mt-1 break-all">
        Règle signée {source.regle} — périmètre {source.shaPerimetre}
      </p>
    </details>
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
 * un bouton laisserait croire à une permission manquante.
 *
 * CE QU'IL EN EST SE DIT UNE FOIS, SOUS LA LISTE, et non sous chaque fragment :
 * la même phrase répétée à chaque ligne noyait les citations qu'elle
 * accompagne — c'est le reproche de verbosité de l'audit du 2026-09-02.
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
      ) : null}
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
  // L'ÉTAT DE FIN DE CHAQUE TÊTE, servi par le serveur (`D-161`). L'écran ne le
  // calcule pas : la règle « le témoignage cède à la preuve » vit dans le
  // module, et deux lectures de la même chose finiraient par diverger.
  const [fins, setFins] = useState<Record<string, LectureFin>>({});
  const [tetesActives, setTetesActives] = useState(0);
  const [departageEnCours, setDepartageEnCours] = useState<string | null>(null);
  const [erreurDepartage, setErreurDepartage] = useState('');
  const [relanceEnCours, setRelanceEnCours] = useState(false);
  const [dateAccord, setDateAccord] = useState('');
  const [accordEnCours, setAccordEnCours] = useState(false);
  const [messageAccord, setMessageAccord] = useState('');
  const [messageRelance, setMessageRelance] = useState('');
  const [ancrage, setAncrage] = useState<AncrageAnamnese>(ANCRAGE_VIDE);
  const [ratifications, setRatifications] = useState<Record<string, EtatRatification>>({});
  const [lignesRatification, setLignesRatification] = useState<LigneRatificationExposee[]>([]);
  // `D-167` §15 — la CAUSE du vide, lue au serveur. `null` tant qu'on ne sait
  // pas : la phrase par défaut n'affirme alors rien.
  const [pourquoiVide, setPourquoiVide] = useState<PourquoiVide>(null);

  // `D-167` §1, §2, §3, §6 — la matière de pré-remplissage et la proposition.
  //
  // `prioriteProposee` PORTE LA MARQUE. Tant qu'il est égal au contenu du champ,
  // le texte est celui de la machine et la mention s'affiche. Au PREMIER
  // caractère modifié l'égalité tombe, et la mention avec elle : le praticien
  // voit en direct que le texte est redevenu le sien (`D-167` §6).
  const [matiere, setMatiere] = useState<MatiereCitable | null>(null);
  const [prioriteProposee, setPrioriteProposee] = useState<string | null>(null);
  const [appelEnCours, setAppelEnCours] = useState(false);
  const [erreurProposition, setErreurProposition] = useState('');
  const [manqueProposition, setManqueProposition] = useState<string[]>([]);
  const [jalonDu, setJalonDu] = useState<FenetreJalonObjectif | null>(null);
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

  /**
   * VIDER LES DÉCLARATIONS DU PRATICIEN À CHAQUE BASCULE DE MODE, et ce n'est
   * pas de l'hygiène : le formulaire n'est jamais DÉMONTÉ — il est masqué —, si
   * bien qu'une valeur saisie pour une version survit dans l'état et **repart
   * avec la version choisie ensuite**.
   *
   * Sur `negocieLe`, ce n'est pas une perte, c'est une **date FAUSSE affichée au
   * patient** : « Convenu le 3 septembre » sous une version dont il n'a jamais
   * entendu parler ce jour-là. Les quatre autres champs voyagent de la même
   * façon — une priorité, un motif de « non traité » abandonnés en cours de
   * route se retrouvent sur un objectif neuf.
   *
   * NE TOUCHE PAS À L'ÉNONCÉ : ses trois origines s'excluent déjà et se
   * nettoient chacune à sa bascule (leçon du LOT-03). Les modes qui REPRENNENT
   * délibérément les champs de la version révisée appellent ce vidage AVANT de
   * les reposer — l'ordre est ce qui rend la reprise sûre.
   */
  const viderDeclarations = useCallback(() => {
    setReformulation('');
    setPriorite('');
    setNegocieLe('');
    setNonTraiteMotif('');
    setNonTraiteDepuisLe('');
  }, []);

  /**
   * RENVOYER LE COURRIER D'UN OBJECTIF DÉJÀ ÉCRIT — et rien d'autre. Aucune
   * ligne n'est créée : c'est ce qui distingue ce geste du contournement qui
   * consistait à « réviser pour déclencher un envoi », c'est-à-dire à se servir
   * d'un geste clinique comme d'un transport.
   *
   * LA CADENCE EST TENUE PAR LE SERVEUR, pas par ce bouton : le dépôt a déjà
   * connu une interdiction qui ne vivait que dans l'écran. Ici on se contente de
   * RENDRE LISIBLE son refus, y compris la date à laquelle ce sera possible.
   */
  const relancer = useCallback(async () => {
    setRelanceEnCours(true);
    setMessageRelance('');
    try {
      const reponse = await fetch('/api/praticien/objectifs/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient }),
      });
      const payload = (await reponse.json()) as {
        ok: boolean;
        error?: string;
        possibleLe?: string;
      };
      if (!reponse.ok || !payload.ok) {
        setMessageRelance(
          payload.possibleLe
            ? `${payload.error ?? 'Le courrier n’a pas pu être renvoyé.'} Possible à partir du ${formatDate(payload.possibleLe)}.`
            : (payload.error ?? 'Le courrier n’a pas pu être renvoyé.'),
        );
        return;
      }
      setMessageRelance('Courrier renvoyé. Votre patient est invité à relire son objectif.');
    } catch {
      setMessageRelance('Le courrier n’a pas pu être renvoyé.');
    } finally {
      setRelanceEnCours(false);
    }
  }, [idPatient]);

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
      setFins(payload.fins);
      setTetesActives(payload.tetesActives);
      setAncrage(payload.ancrage);
      setRatifications(payload.ratifications);
      setLignesRatification(payload.lignesRatification ?? []);
      setJalonDu(payload.jalonDu ?? null);
      setAmendements(payload.amendements);
      setReponsesJalon(payload.reponsesJalon);
      setEtat('chargee');
    } catch {
      setErreur('Les objectifs n’ont pas pu être chargés.');
      setEtat('erreur');
    }
  }, [idPatient]);

  /**
   * LE DÉPARTAGE — et c'est le seul geste qui ramène deux têtes à une.
   * `supersedes_objectif_id` étant à parent unique, aucun ajout d'objectif ne
   * peut faire décroître le nombre de têtes : il faut une ligne de FIN sur la
   * racine perdante, portant la racine qui prend la suite (`D-161`, motif
   * `remplace`). Rien n'est effacé — la chaîne écartée reste lisible, marquée.
   */
  const departager = useCallback(
    async (racinePerdante: string, racineGagnante: string) => {
      setDepartageEnCours(racinePerdante);
      setErreurDepartage('');
      try {
        const reponse = await fetch('/api/praticien/objectifs/fin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idPatient,
            racineObjectifId: racinePerdante,
            motif: 'remplace',
            voix: 'praticien',
            sens: 'declare',
            remplaceParRacineId: racineGagnante,
          }),
        });
        const payload = (await reponse.json()) as { ok: boolean; error?: string };
        if (!reponse.ok || !payload.ok) {
          setErreurDepartage(payload.error ?? 'Le départage n’a pas pu être enregistré.');
          return;
        }
        await chargerDossier();
      } catch {
        setErreurDepartage('Le départage n’a pas pu être enregistré.');
      } finally {
        setDepartageEnCours(null);
      }
    },
    [idPatient, chargerDossier],
  );

  /**
   * ATTESTER UN ACCORD CONCLU DE VIVE VOIX (`D-161` §11).
   *
   * N'ÉCRIT PAS DANS LA CHAÎNE : aucune version n'est créée. C'est une ligne à
   * part, dans sa propre table, et c'est ce qui la distingue de l'ancienne
   * colonne `negocie_le` — un fait de chaîne rangé dans une colonne de version,
   * perdable à la révision et falsifiable au formulaire.
   */
  const attesterAccord = useCallback(
    async (idObjectif: string) => {
      setAccordEnCours(true);
      setMessageAccord('');
      try {
        const reponse = await fetch('/api/praticien/objectifs/accord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPatient, idObjectif, convenuLe: dateAccord }),
        });
        const payload = (await reponse.json()) as { ok: boolean; error?: string };
        if (!reponse.ok || !payload.ok) {
          setMessageAccord(payload.error ?? 'L’accord n’a pas pu être noté.');
          return;
        }
        setDateAccord('');
        setMessageAccord('Accord noté. Votre patient lira qu’il vient de vous.');
        await chargerDossier();
      } catch {
        setMessageAccord('L’accord n’a pas pu être noté.');
      } finally {
        setAccordEnCours(false);
      }
    },
    [idPatient, dateAccord, chargerDossier],
  );

  // DÉPENDANCE STABLE. `chargerDossier` ne dépend que de `idPatient` ; un
  // littéral recréé au rendu ferait retirer le GET en boucle, et ce GET
  // JOURNALISE l'accès au dossier (G-TRUST-04) — le journal se remplirait de
  // lignes que personne n'a demandées (cicatrice `ClinicalRuntimeSection.tsx:80-81`).

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
        setPourquoiVide(null);
        return;
      }
      setPropositions(payload.propositions);
      setDisposees(payload.disposees);
      setCaduques(payload.caduques);
      // UNE RAISON PÉRIMÉE NE SURVIT PAS À UNE RELECTURE. Sans cette remise à
      // jour, un dossier qui vient de recevoir sa confirmation d'épisode
      // continuerait d'afficher « aucun n'est confirmé » — le défaut corrigé,
      // reconstitué par la mémoire de l'écran.
      setPourquoiVide(payload.pourquoiVide ?? null);
      setEtatPropositions('ouverte');
    } catch {
      setEtatPropositions('erreur');
      setPropositions([]);
      setDisposees([]);
      setCaduques([]);
      setPourquoiVide(null);
    }
  }, [idPatient]);

  /**
   * LIT LA MATIÈRE ET LA PROPOSITION FIGÉE — SANS JAMAIS APPELER LE MODÈLE.
   *
   * Le `GET` de cette route ne fait parler personne (`D-167` §3 amendé) :
   * ouvrir un cockpit ne coûte rien. C'est le bouton qui appelle.
   */
  const chargerMatiere = useCallback(async () => {
    setErreurProposition('');
    try {
      // `D-167` §13 — l'identifiant de la version amendée voyage avec la
      // demande : c'est le serveur qui compare les sources, pas l'écran.
      const amende = reformuleId === null ? '' : `&amende=${encodeURIComponent(reformuleId)}`;
      const reponse = await fetch(
        `/api/praticien/objectifs/proposition-priorite?idPatient=${encodeURIComponent(idPatient)}${amende}`,
      );
      const payload = (await reponse.json()) as PropositionApiResponse;
      if (!reponse.ok || !payload.ok) {
        // ÉCHEC DE LECTURE ≠ ABSENCE DE MATIÈRE. On n'affirme rien : les champs
        // restent vides et aucune phrase ne prétend savoir pourquoi.
        setMatiere(null);
        setManqueProposition([]);
        return;
      }
      if (payload.etat === 'sources_manquantes') {
        setMatiere(null);
        setManqueProposition(payload.manque);
        return;
      }
      setManqueProposition([]);
      // `?? null` ET NON L'AFFECTATION NUE. Une réponse sans `matiere` — un
      // serveur plus ancien, ou un contrat qui bouge — donnait `undefined`, que
      // le garde `=== null` laissait passer : l'écran plantait sur
      // `matiere.enonce`. Un champ absent doit se lire comme absent.
      setMatiere(payload.matiere ?? null);
      if (payload.etat === 'proposee') setPrioriteProposee(payload.proposition.texte);
    } catch {
      setMatiere(null);
      setManqueProposition([]);
    }
  }, [idPatient, reformuleId]);

  useEffect(() => {
    void chargerDossier();
  }, [chargerDossier]);

  useEffect(() => {
    void chargerMatiere();
  }, [chargerMatiere]);

  /**
   * LE PRÉ-REMPLISSAGE N'ÉCRASE JAMAIS UNE SAISIE.
   *
   * Il ne pose un texte que dans un champ VIDE. Le praticien qui a commencé à
   * écrire, puis dont la matière arrive, ne doit pas voir ses mots remplacés —
   * c'est la faute que le placeholder inventé a values au champ d'à côté.
   */
  useEffect(() => {
    if (matiere == null) return;
    setEnonce((actuel) => (actuel.trim() === '' ? matiere.enonce.texte : actuel));
    // LA REFORMULATION N'EST PLUS PRÉ-REMPLIE — arbitrage du 2026-09-11. Elle
    // et « Ce que j'ai compris de vous » étaient le MÊME geste écrit à deux
    // endroits de la phase 3, nourris de la même synthèse validée, et tous deux
    // lus par le patient. Le résumé global a pris cette charge ; le champ
    // disparaît de l'écran plutôt que de rester à côté en doublon.
    //
    // `matiere.reformulation` CONTINUE D'ARRIVER de la route : elle n'a pas
    // cessé d'être une citation valide, et la retirer de l'API aurait été un
    // changement de surface que rien n'exige ici.
  }, [matiere]);

  // ── `D-167` §13 : UN CONFLIT CONSIGNÉ, NON RÉSOLU EN SILENCE ───────────────
  //
  // §13 dit qu'une RÉÉCRITURE « repart des sources » plutôt que de reprendre la
  // version qu'on amende. Appliqué à la lettre, cela recréerait un défaut que le
  // code garde déjà — le commentaire de « Reformuler cette version » l'écrit :
  // reprendre les champs praticien évite que `priorite` et « non traité »
  // « retombent à vide sur la nouvelle tête », la version courante perdant en
  // silence ce qu'elle portait.
  //
  // DEUX RAISONS DE NE PAS L'APPLIQUER TEL QUEL CE SOIR :
  //
  //   1. « Non traité pour l'instant » N'A AUCUNE SOURCE (§7, qui refuse
  //      explicitement de le pré-remplir). « Repartir des sources » ne peut donc
  //      pas le remplir — seulement le perdre ;
  //   2. la cadence de [[D-166]] garantit qu'aucun dépôt ni aucune synthèse
  //      nouvelle n'arrive avant une ancre de cycle. Dans un même cycle,
  //      « repartir des sources » remplacerait donc la reformulation TRAVAILLÉE
  //      du praticien par le `narratif_patient` brut — sans rien gagner, la
  //      matière étant identique.
  //
  // CE QUI EST FAIT ICI : le pré-remplissage ne pose un texte que dans un champ
  // VIDE, et la reprise de version continue de porter les champs praticien. Sur
  // un premier objectif, les trois champs arrivent remplis — la demande
  // d'origine. Sur une réécriture, rien n'est perdu.
  //
  // CE QUI RESTE À TRANCHER : rafraîchir les deux citations quand les sources
  // sont PLUS RÉCENTES que la version amendée. Les colonnes de provenance posées
  // le 2026-09-10 (`enonce_source_id`, `reformulation_source_id`) le rendent
  // calculable — c'est un lot à part, pas une ligne à glisser ici.

  useEffect(() => {
    if (prioriteProposee === null) return;
    setPriorite((actuel) => (actuel.trim() === '' ? prioriteProposee : actuel));
  }, [prioriteProposee]);

  /** Le bouton — « Proposer une priorité », et « une autre ». */
  const demanderProposition = useCallback(async () => {
    setAppelEnCours(true);
    setErreurProposition('');
    try {
      const reponse = await fetch('/api/praticien/objectifs/proposition-priorite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idPatient }),
      });
      const payload = (await reponse.json()) as PropositionApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreurProposition(
          ('error' in payload && payload.error) || 'La proposition n’a pas pu être produite.',
        );
        return;
      }
      if (payload.etat === 'sources_manquantes') {
        setManqueProposition(payload.manque);
        return;
      }
      if (payload.etat === 'proposee') {
        setPrioriteProposee(payload.proposition.texte);
        // LE TIRAGE DEMANDÉ REMPLACE LE CHAMP, même non vide : le praticien
        // vient de cliquer pour en obtenir un autre. C'est le seul endroit où
        // écraser est ce qu'il demande.
        setPriorite(payload.proposition.texte);
      }
    } catch {
      setErreurProposition('La proposition n’a pas pu être produite.');
    } finally {
      setAppelEnCours(false);
    }
  }, [idPatient]);

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
        Ce que le patient demande, dans ses mots, et ce que vous en avez compris. Les versions
        précédentes restent consultables ci-dessous.
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
            {/* LE MODE D'EMPLOI SUIT LE MATÉRIAU. Sans consultation validée il
                n'y a rien à reprendre : expliquer comment ne pas le recopier
                ajoutait deux lignes sous une absence déjà énoncée. */}
            {ancrage.consultationValidee && (
              <p className="mt-2 text-sm text-muted-foreground">
                Déclarations recueillies à l’anamnèse, dans un autre contexte que cet entretien : matériau de
                départ, jamais un objectif négocié. Rien n’est recopié automatiquement dans la saisie.
              </p>
            )}
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
                // TROIS BRANCHES, ET CHACUNE N'AFFIRME QUE CE QUI A ÉTÉ LU
                // (`D-167` §15).
                //
                // LE DÉFAUT, corrigé ici. Une phrase unique disait « sans
                // épisode confirmé, il n'a rien de signé à citer » DÈS QUE la
                // liste était vide — y compris sur un dossier dont l'épisode
                // EST confirmé, constaté sur dossier réel le 2026-09-10. Le
                // motif était nommé, mais il n'était pas vérifié : l'écran
                // énonçait une cause qu'il ne connaissait pas. C'est la même
                // faute que le rail de phase 3, qui mettait l'attente sur le dos
                // du patient sans avoir regardé de quel côté elle était.
                //
                // `pourquoiVide` VIENT DU SERVEUR, qui lit les deux
                // préconditions de l'assemblage. Un `undefined` — réponse d'un
                // serveur plus ancien — ne retombe PAS sur l'ancienne phrase :
                // il donne la formulation qui n'affirme rien.
                <p className="mt-3 text-base text-muted-foreground">
                  {pourquoiVide === 'episode_non_confirme'
                    ? 'Aucune proposition. Wellneuro n’assemble qu’après la confirmation d’un épisode, et aucun n’est confirmé sur ce dossier.'
                    : pourquoiVide === 'referentiel_non_signe'
                      ? 'Aucune proposition. Le référentiel signé n’est pas disponible : sans lui, il n’y a rien de signé à citer.'
                      : pourquoiVide === 'rien_retenu'
                        ? 'Aucune proposition. L’épisode est confirmé et le référentiel est signé — aucune règle publiée ne s’applique à ce dossier.'
                        : 'Aucune proposition à afficher.'}
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
                                // Une reprise ouvre un objectif NEUF : rien de
                                // ce qui a été saisi pour un autre ne le suit.
                                viderDeclarations();
                              }
                            : undefined
                        }
                      />
                    ))}
                  </ul>

                  {/* DIT UNE FOIS POUR LA LISTE : voir `FragmentCite`. */}
                  {proposition.fragments.some(
                    (fragment) => lireSource(fragment.source)?.nature !== 'anamnese',
                  ) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Les fragments sans bouton ne sont pas des paroles du patient : ils éclairent la
                      proposition, ils ne deviennent pas son énoncé.
                    </p>
                  )}

                  {ecarteDe === proposition.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {/* Label simple — la justification de gouvernance aval
                          (curation du classement des candidats) vit dans la
                          doc du lot, pas devant le praticien (audit
                          2026-09-02, fuite de processus interne). */}
                      <label className="text-sm text-muted-foreground" htmlFor={`motif-${proposition.id}`}>
                        Pourquoi cette proposition ne convient pas
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

              {/* REPLIÉES PAR DÉFAUT — ce sont des archives : elles se
                  consultent, elles n'attendent aucun geste. `<details>` natif
                  et non `TwoLevelReading` : le contenu reste dans le DOM, donc
                  lisible par la recherche du navigateur et par les bancs.

                  SANS DÉCOMPTE dans le résumé : `D-110` interdit de compter les
                  amendements sur cette surface autant que de les résumer, et
                  `G2-bis` refuse tout `{x.length}` rendu ici. Un « (3) » collé
                  au titre paraît anodin — c'est exactement la comparaison que
                  la décision proscrit. */}
              {disposees.length > 0 && (
                <details className="mt-4 border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Déjà tranchées
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {disposees.map((proposition) => (
                      <ResumeProposition
                        key={proposition.id}
                        prefixe={proposition.disposition === 'reprise' ? 'Reprise' : 'Écartée'}
                        proposition={proposition}
                      />
                    ))}
                  </ul>
                </details>
              )}

              {caduques.length > 0 && (
                <details className="mt-4 border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Périmées
                  </summary>
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
                </details>
              )}
            </aside>
          )}

          {objectifs.length === 0 && (
            <p className="text-base text-muted-foreground">Aucun objectif négocié pour ce dossier.</p>
          )}

          {/* ── L'ÉTAPE ATTENDUE, PAS SEULEMENT CELLES QUI SONT ARRIVÉES ──
              `jalonObjectifDu` n'était consommé que par le PORTAIL : le cockpit
              montrait les réponses reçues, jamais celles qu'on attend. Le
              praticien ne savait donc pas qu'une fenêtre s'ouvrait, ni quand
              elle se refermait — et relançait au hasard, ou pas du tout.

              LE MOTIF EST DIT QUAND RIEN N'EST OUVERT, jamais un blanc : un
              écran muet laisse croire à une panne, et « le patient n'a pas
              répondu » ferait d'un silence un manquement (`DC-24`). */}
          {jalonDu && (
            <p className="text-sm text-muted-foreground">
              {jalonDu.statut === 'ouverte'
                ? `Étape ${jalonDu.jalon} : votre patient peut répondre jusqu’au ${formatDate(jalonDu.fermeLe)}.`
                : jalonDu.prochaineOuverture
                  ? `${jalonDu.motif} Prochaine étape${jalonDu.prochainJalon ? ` (${jalonDu.prochainJalon})` : ''} à partir du ${formatDate(jalonDu.prochaineOuverture)}.`
                  : jalonDu.motif}
            </p>
          )}

          {tetesActives > 1 && (
            // ON N'EN GARDE PAS UN SEUL EN SILENCE : deux reformulations
            // concurrentes ont créé deux versions courantes, et trancher sans le
            // dire ferait disparaître le travail de l'une des deux (`DC-30`).
            // Mais l'état ne se subit plus : depuis `D-161`, un geste EXPLICITE
            // du praticien départage, et il porte son nom.
            //
            // TANT QU'IL N'EST PAS POSÉ, LE PATIENT NE PEUT RIEN RÉPONDRE : le
            // portail refuse ses trois gestes en 409. Le dire ici, c'est dire
            // pourquoi le geste presse.
            <section
              role="status"
              className="rounded-lg border border-status-warning/40 bg-status-warning/5 p-3"
            >
              <p className="text-sm text-status-warning">
                {tetesActives} versions courantes coexistent pour ce dossier — deux reformulations ont
                été enregistrées en parallèle. <strong>Votre patient ne peut ni ratifier, ni contester,
                ni proposer une autre formulation</strong> tant qu’elles ne sont pas départagées.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Choisir laquelle poursuivre n’efface rien : l’autre chaîne reste lisible, marquée
                comme remplacée, avec tout ce que le patient y a écrit.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {trajectoires
                  .filter((t) => fins[t.idObjectif]?.etat !== 'close')
                  .map((gardee) => {
                    const racineGardee = gardee.lignes[gardee.lignes.length - 1]?.id;
                    const courante = gardee.lignes[0];
                    if (!racineGardee || !courante) return null;
                    return (
                      <li key={gardee.idObjectif}>
                        <button
                          type="button"
                          disabled={departageEnCours !== null}
                          onClick={() => {
                            // Toutes les AUTRES chaînes actives cèdent la place à
                            // celle-ci — une ligne `remplace` par racine perdante.
                            const perdantes = trajectoires
                              .filter((t) => t.idObjectif !== gardee.idObjectif)
                              .filter((t) => fins[t.idObjectif]?.etat !== 'close')
                              .map((t) => t.lignes[t.lignes.length - 1]?.id)
                              .filter((id): id is string => typeof id === 'string');
                            void (async () => {
                              for (const perdante of perdantes) {
                                await departager(perdante, racineGardee);
                              }
                            })();
                          }}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-accent/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          <span className="block font-medium">Poursuivre celle-ci</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            « {courante.enoncePatient} »
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
              {erreurDepartage && (
                <p role="alert" className="mt-2 text-sm text-status-danger">
                  {erreurDepartage}
                </p>
              )}
            </section>
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

                {/* ── NOTER UN ACCORD CONCLU EN CONSULTATION ─────────────────
                    UN TÉMOIGNAGE, PAS UNE PREUVE. Le geste que le patient pose
                    lui-même vit au portail ; ici, vous attestez ce que vous avez
                    ENTENDU. Le témoignage cède à la preuve à la lecture : si le
                    patient se prononce ensuite, c'est SA réponse qui s'affiche.
                    La date est OBLIGATOIRE — c'est l'objet de l'attestation. */}
                {tetesActives === 1 && fins[trajectoire.idObjectif]?.etat !== 'close' && (
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <label
                      htmlFor={`accord-${trajectoire.idObjectif}`}
                      className="block text-xs font-medium text-foreground"
                    >
                      Accord conclu en consultation, le
                    </label>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        id={`accord-${trajectoire.idObjectif}`}
                        type="date"
                        value={dateAccord}
                        onChange={(evenement) => setDateAccord(evenement.target.value)}
                        className="rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      />
                      <button
                        type="button"
                        disabled={accordEnCours || dateAccord === ''}
                        onClick={() => void attesterAccord(trajectoire.idObjectif)}
                        className="min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-accent/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        {accordEnCours ? 'Enregistrement…' : 'Noter cet accord'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Votre patient lira que l’accord vient de vous, pas de lui. S’il se prononce
                      ensuite depuis son espace, c’est sa réponse qui s’affichera.
                    </p>
                    {messageAccord && (
                      <p role="status" className="mt-1 text-xs text-foreground">
                        {messageAccord}
                      </p>
                    )}
                  </div>
                )}

                {/* ── RENVOYER LE COURRIER ────────────────────────────────────
                    L'envoi ne part qu'à l'ÉCRITURE d'un objectif : un objectif
                    rédigé avant la mise en service de l'expéditeur, ou dont le
                    courrier s'est perdu, était MUET PAR CONSTRUCTION — son
                    patient ne pouvait pas savoir qu'un texte l'attendait.
                    Offert seulement quand il y a quelque chose à annoncer :
                    UNE tête active, non close, et un patient qui ne s'est pas
                    encore prononcé. Le relancer après sa réponse lui dirait
                    qu'on ne l'a pas lu. */}
                {tetesActives === 1
                  && fins[trajectoire.idObjectif]?.etat !== 'close'
                  && (ratifications[trajectoire.idObjectif] ?? 'en_attente') === 'en_attente' && (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={relanceEnCours}
                        onClick={() => void relancer()}
                        className="min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-accent/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        {relanceEnCours ? 'Envoi…' : 'Renvoyer le courrier au patient'}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Rien n’est modifié : aucune version n’est créée, seul le courrier repart.
                      </p>
                      {messageRelance && (
                        <p role="status" className="mt-1 text-xs text-foreground">
                          {messageRelance}
                        </p>
                      )}
                    </div>
                  )}

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
                                  viderDeclarations();
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
                                // Vider AVANT la reprise, même motif qu'à
                                // « Reformuler cette version ».
                                viderDeclarations();
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
                    // VIDER D'ABORD : ce que la version révisée ne porte pas ne
                    // doit pas être hérité d'une saisie abandonnée ailleurs.
                    viderDeclarations();
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

                {/* REPLIÉES PAR DÉFAUT depuis l'audit du 2026-09-02 — même
                    patron `<details>` que ComprehensionPanel : rien n'est
                    écrasé ni retiré du DOM, l'écran cesse seulement de tout
                    déplier en permanence. */}
                {anterieures.length > 0 && (
                  <details className="mt-3 border-t border-border pt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Versions antérieures ({anterieures.length})
                    </summary>
                    <ol className="mt-2 flex flex-col gap-3">
                      {anterieures.map((ligne) => {
                        /* LE GESTE DU PATIENT RESTE ATTACHÉ À SA VERSION
                           (`F2`, P1). La map d'états ne porte que les TÊTES :
                           une contestation posée sur `v1` cessait d'être
                           visible ici dès qu'une `v2` était écrite — pendant
                           que l'amendement et la réponse d'étape, eux,
                           restaient affichés sur toute la chaîne. C'est le
                           geste le plus BREF qui disparaissait, et c'est
                           souvent le plus décisif : un patient qui conteste. */
                        const gestes = lignesRatification.filter(
                          (geste) => geste.idObjectif === ligne.id,
                        );
                        return (
                          <li key={ligne.id} className="opacity-80">
                            <LigneObjectif ligne={ligne} />
                            {gestes.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {gestes.map((geste) => (
                                  <li key={geste.id} className="text-xs text-muted-foreground">
                                    {LIBELLE_RATIFICATION[
                                      geste.sens === 'ratifie' ? 'ratifie' : 'conteste'
                                    ]}{' '}
                                    — sur CETTE version, le {formatDate(geste.creeLe)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </details>
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
                      viderDeclarations();
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
                  Cette phrase devient l’énoncé du patient telle quelle — non modifiable.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRepriseDe(null);
                      viderDeclarations();
                    }}
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
                  onClick={() => {
                    setReformuleId(null);
                    viderDeclarations();
                  }}
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
                {/* UNE CONSIGNE, JAMAIS UN EXEMPLE — et c'est le seul champ du
                    dépôt où la distinction porte à conséquence. `enoncePatient`
                    est le texte dont [[D-094]] dit « verbatim, jamais
                    paraphrasé » : y afficher une phrase clinique plausible
                    (« Je voudrais dormir sans me réveiller à trois heures. »,
                    posée jusqu'au 2026-09-10) propose un MODÈLE À IMITER là où
                    la règle est de recopier. Les trois autres champs de ce
                    panneau portent tous une consigne ; celui-ci faisait
                    exception, sans raison.

                    Le risque n'est pas théorique : l'exemple a été lu comme un
                    contenu déjà présent lors d'une relecture sur dossier réel,
                    le compteur à `0` ne suffisant pas à le démentir. */}
                <textarea
                  id="objectif-enonce"
                  value={enonce}
                  onChange={(evenement) => setEnonce(evenement.target.value)}
                  rows={3}
                  placeholder="Ses mots, tels qu’il les a dits…"
                  className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <Compteur valeur={enonce} maximum={LONGUEUR_MAX_ENONCE} />
                {/* `D-167` §13 — IL LE DIT ET IL PROPOSE, IL NE REMPLACE PAS.
                    La lecture littérale de la clause — « une réécriture repart
                    des sources » — ferait disparaître sous les doigts du
                    praticien un texte qu'il a travaillé, et ferait retomber
                    `priorite` et « non traité » à vide sur la nouvelle tête.
                    L'écart est SIGNALÉ, la reprise est un geste. */}
                {matiere?.fraicheur?.enonce === 'plus_recente' && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Le patient a déposé un texte plus récent que celui cité par cette version.</span>
                    <button
                      type="button"
                      onClick={() => setEnonce(matiere.enonce.texte)}
                      className="min-h-9 rounded-lg border border-accent px-2 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      Reprendre le dépôt à jour
                    </button>
                  </p>
                )}
              </>
            )}

            {/* LE CHAMP DE REFORMULATION A ÉTÉ RETIRÉ — arbitrage du 2026-09-11.
                Il demandait au praticien, dans la MÊME phase, de redire ce
                qu'il avait compris alors que « Ce que j'ai compris de vous » le
                lui demandait déjà, et les deux textes atteignaient le patient.
                Le résumé global porte désormais ce geste, une seule fois.

                LA COLONNE RESTE EN BASE, et le portail continue d'afficher une
                reformulation existante : le retrait porte sur l'ÉCRAN
                PRATICIEN seul. Aucune reformulation n'existait en production au
                jour du retrait — la mesure a été faite avant de décider. */}

            {/* CHAMP TEXTE LIBRE, jamais une liste déroulante ni un badge
                ordonné : une liste fermée serait un rang, et un rang serait un
                score (`schema.prisma:1955-1957`). */}
            <label htmlFor="objectif-priorite" className="mt-3 block text-xs font-medium text-foreground">
              Priorité (libellé libre)
            </label>

            {/* LA MARQUE, ET LE MOMENT EXACT OÙ ELLE TOMBE (`D-167` §6).
                Elle s'affiche tant que le champ contient EXACTEMENT le texte
                proposé. Au premier caractère modifié, l'égalité tombe et la
                mention disparaît — le praticien voit en direct que le texte est
                redevenu le sien. La comparer à l'enregistrement aurait laissé
                l'écran annoncer une proposition pendant qu'il la réécrit. */}
            {prioriteProposee !== null && priorite === prioriteProposee && (
              <p className="mt-1 rounded-lg border border-accent bg-accent/5 px-2 py-1 text-xs text-solar-ink">
                Proposé par la machine, à valider. Réécrivez-le et il redevient le vôtre.
              </p>
            )}
            <input
              id="objectif-priorite"
              type="text"
              value={priorite}
              onChange={(evenement) => setPriorite(evenement.target.value)}
              placeholder="Ce sur quoi on travaille d’abord…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <Compteur valeur={priorite} maximum={LONGUEUR_MAX_PRIORITE} />

            {/* LE BOUTON — L'APPEL PART SUR UN GESTE, JAMAIS À L'OUVERTURE
                (`D-167` §3 amendé). Deux libellés pour un seul geste : la
                première fois on propose, ensuite on en demande une autre. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {manqueProposition.length === 0 && matiere !== null && (
                <button
                  type="button"
                  onClick={() => void demanderProposition()}
                  disabled={appelEnCours}
                  className="min-h-9 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
                >
                  {appelEnCours
                    ? 'Rédaction…'
                    : prioriteProposee === null
                      ? 'Proposer une priorité'
                      : 'Une autre'}
                </button>
              )}

              {/* CE QUI MANQUE EST NOMMÉ, JAMAIS DEVINÉ. Les deux pièces sont
                  exigées : sans le dépôt du patient, il n'y a pas de
                  proposition, et le dire est plus honnête que de griser un
                  bouton sans raison. */}
              {manqueProposition.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {manqueProposition.includes('synthese_validee')
                    && manqueProposition.includes('depot_patient')
                    ? 'Aucune priorité ne peut être proposée : il manque une synthèse validée et le dépôt du patient.'
                    : manqueProposition.includes('synthese_validee')
                      ? 'Aucune priorité ne peut être proposée : aucune synthèse n’est validée sur ce dossier.'
                      : 'Aucune priorité ne peut être proposée : le patient n’a pas encore écrit ce qui compte pour lui.'}
                </p>
              )}
            </div>

            {/* UN ÉCHEC SE DIT, avec un bouton pour réessayer (`D-167` §3). Un
                champ vide et silencieux serait indiscernable d'un dossier sans
                matière — la faute corrigée deux fois le 2026-09-10. */}
            {erreurProposition && (
              <div
                role="alert"
                className="mt-2 flex flex-col gap-2 rounded-lg border border-accent bg-status-warning/10 p-2 text-xs text-status-warning"
              >
                <span>{erreurProposition}</span>
                <button
                  type="button"
                  onClick={() => void demanderProposition()}
                  disabled={appelEnCours}
                  className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* LA DATE D'ACCORD A QUITTÉ CE FORMULAIRE (`D-161` §11). C'était
                un fait de CHAÎNE rangé dans une colonne de VERSION : à la fois
                perdable — une révision la laissait derrière — et falsifiable,
                le formulaire n'étant jamais démonté. Surtout, elle laissait UNE
                voix affirmer un accord que l'autre n'avait pas donné.
                Elle se note désormais par un geste à part, sur la version
                courante, et se LIT depuis le fait qui la porte. */}

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
