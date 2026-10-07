'use client';

import { useRef, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { CadranNuit } from './CadranNuit';
import {
  ARIA_AIDE_SOMMEIL,
  ARIA_EXTINCTION_DIFFEREE,
  ARIA_EXTINCTION_IMMEDIATE,
  ARIA_LEVER_DIFFERE,
  ARIA_LEVER_IMMEDIAT,
  ARIA_QUALITE,
  ARIA_FORME,
  ARIA_REVEILS,
  EMOJI_FORME,
  EMOJI_QUALITE,
  LABEL_AIDE_SOMMEIL,
  LABEL_FACTEURS,
  LABEL_LATENCE,
  LABEL_EXTINCTION_DIFFEREE,
  LABEL_EXTINCTION_IMMEDIATE,
  LABEL_LEVER_DIFFERE,
  LABEL_LEVER_IMMEDIAT,
  LABEL_REVEILS_PATIENT,
  LABEL_RIEN_DE_PARTICULIER,
  LABEL_SIESTE,
  PORTEE_AIDE_SOMMEIL,
  QUESTION_EXTINCTION,
  QUESTION_LEVER,
} from '@/lib/agenda-sommeil/libelles';
import { ensureNuitReponses } from '@/lib/agenda-sommeil/nuit';
import {
  CLASSES_AIDE_SOMMEIL,
  CLASSES_DUREE_REVEILS,
  CLASSES_LATENCE,
  CLASSES_SIESTE,
  CLES_FACTEURS,
  NB_REVEILS_MAX,
  type ClasseAideSommeil,
  type ClasseDureeReveils,
  type ClasseLatence,
  type ClasseSieste,
  type CleFacteur,
  type FacteursNuit,
  type NuitReponses,
} from '@/lib/agenda-sommeil/types';

// Saisie d'une nuit — SANS CLAVIER : cadran tactile pour les ancres horaires,
// puces et emoji pour le reste. Aucun champ de texte.
//
// Sept gestes obligatoires : les deux poignées du cadran, le mode de coucher,
// l'endormissement, la nuit (continue ou coupée), l'aide au sommeil, le mode de
// lever et la qualité. Deux poignées supplémentaires n'apparaissent que si le
// patient déclare du temps au lit éveillé, le soir ou le matin. Le reste est
// facultatif et replié.
//
// C'est le prix de la couverture du noyau du Consensus Sleep Diary, qui compte
// neuf items : chacune des questions ajoutées comble un angle mort qui rendait
// une métrique fausse plutôt qu'imprécise.
//
// RIEN N'EST PRÉ-COCHÉ. En v1 le formulaire s'ouvrait pré-rempli avec la nuit de
// la veille — latence et qualité comprises — et le bouton d'envoi était actif
// sans un seul geste : on pouvait valider vingt copies conformes de sa première
// nuit. Seuls les horaires reçoivent une suggestion, en pointillé, qui ne
// devient une valeur qu'au toucher.

function ChoixEmoji({
  label,
  emojis,
  aria,
  value,
  onChange,
}: {
  label: string;
  emojis: readonly string[];
  aria: readonly string[];
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex justify-between gap-1">
        {emojis.map((emoji, i) => {
          const note = i + 1;
          const actif = value === note;
          return (
            <button
              key={note}
              type="button"
              aria-label={aria[i]}
              aria-pressed={actif}
              onClick={() => onChange(note)}
              className={`h-12 w-12 rounded-full text-2xl transition-transform ${
                actif ? 'bg-primary/15 scale-110 ring-2 ring-primary/40' : 'hover:bg-muted'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      {/* Les deux ancres de l'échelle, VISIBLES : un visage seul se lit comme
          une humeur ou une fatigue autant que comme une qualité. Ce sont les
          mots de l'aria, inchangés — l'item entre dans l'indice, on ne touche
          pas à son stimulus. */}
      <div aria-hidden="true" className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{aria[0]}</span>
        <span>{aria[aria.length - 1]}</span>
      </div>
    </div>
  );
}

function Puces<T extends string>({
  label,
  aide,
  options,
  libelle,
  aria,
  value,
  onChange,
}: {
  label: string;
  aide?: string;
  options: readonly T[];
  libelle: (v: T) => string;
  aria?: (v: T) => string;
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className={`text-sm font-medium text-foreground ${aide ? '' : 'mb-2'}`}>{label}</p>
      {aide && <p className="text-xs text-muted-foreground mb-2">{aide}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const actif = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={actif}
              aria-label={aria ? aria(opt) : undefined}
              onClick={() => onChange(opt)}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm border transition-colors ${
                actif
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:bg-muted'
              }`}
            >
              {libelle(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compteur tactile − / + : le compte exact de réveils sans clavier (le
// formulaire n'a aucun champ de texte, et un pavé numérique la nuit est
// exactement ce qu'on ne veut pas remettre dans les mains du patient).
// Décrémenter depuis 1 revient à « pas de réponse » : 0 n'est pas saisissable
// ici — il est réservé à la nuit continue, qui le pose d'elle-même.
function Compteur({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  max: number;
  onChange: (v: number | undefined) => void;
}) {
  const bouton =
    'min-h-11 min-w-11 rounded-xl border border-border text-lg text-foreground ' +
    'hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Un réveil de moins"
          disabled={value === undefined}
          onClick={() => onChange(value !== undefined && value > 1 ? value - 1 : undefined)}
          className={bouton}
        >
          −
        </button>
        <span aria-live="polite" className="min-w-24 text-center text-sm text-foreground">
          {value === undefined ? '—' : value === 1 ? '1 réveil' : `${value} réveils`}
        </span>
        <button
          type="button"
          aria-label="Un réveil de plus"
          disabled={value !== undefined && value >= max}
          onClick={() => onChange(value === undefined ? 1 : Math.min(value + 1, max))}
          className={bouton}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Les blocs vers lesquels un envoi incomplet ramène le patient. Les repères
// conditionnels (🛏️, 👁️) vivent sur le cadran : ils y ramènent aussi.
type Bloc = 'cadran' | 'coucher' | 'latence' | 'nuit' | 'aide' | 'lever' | 'qualite';

// Les trois refus d'ORDRE de `ensureNuitReponses` (lib/agenda-sommeil/nuit.ts,
// mode écriture) : « L'extinction doit suivre… », « Le réveil doit se situer
// avant… », « Le réveil doit suivre… ». Un banc les fige.
const RE_REFUS_ORDRE = /doit (suivre|se situer)/;

// « a », « a et b », « a, b et c ».
function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

type Props = {
  // Renseigné UNIQUEMENT en correction d'une nuit déjà saisie. Jamais la nuit
  // de la veille : ce serait rouvrir la porte au report automatique.
  initial: NuitReponses | null;
  // Horaires habituels du patient (médianes des nuits précédentes) : position
  // d'ouverture des poignées, en pointillé, sans valeur tant qu'on n'y touche pas.
  horairesHabituels: { extinction: string; sortie: string };
  // Vrai seulement si ces horaires viennent des nuits DU PATIENT. Sur les
  // horaires par défaut (aucune nuit encore), « confirmer ces horaires »
  // ferait valider en un geste une heure que personne n'a donnée.
  suggestionsPersonnelles?: boolean;
  // Refus du serveur, rendu À CÔTÉ DU BOUTON : en tête de page, il restait
  // hors champ sur téléphone, sous un formulaire long.
  refus?: string;
  submitting: boolean;
  ctaLabel?: string;
  onSubmit: (reponses: NuitReponses) => void;
};

export function SaisieNuitForm({
  initial,
  horairesHabituels,
  suggestionsPersonnelles = false,
  refus = '',
  submitting,
  ctaLabel = 'C’est noté ✓',
  onSubmit,
}: Props) {
  const [heureCoucher, setHeureCoucher] = useState<string | undefined>(initial?.heureCoucher);
  const [heureLever, setHeureLever] = useState<string | undefined>(initial?.heureLever);
  const [latence, setLatence] = useState<ClasseLatence | undefined>(initial?.latence);
  const [qualite, setQualite] = useState<number | undefined>(initial?.qualite);
  // Une nuit héritée v1 peut porter une classe d'éveil qui n'est plus proposée :
  // on la traite comme non répondue plutôt que de pré-sélectionner une tuile
  // inexistante — le patient reprend simplement la question.
  const [dureeReveils, setDureeReveils] = useState<ClasseDureeReveils | undefined>(() => {
    const heritee = initial?.reveils?.dureeTotale;
    return heritee !== undefined && (CLASSES_DUREE_REVEILS as readonly string[]).includes(heritee)
      ? (heritee as ClasseDureeReveils)
      : undefined;
  });
  const [aideSommeil, setAideSommeil] = useState<ClasseAideSommeil | undefined>(
    initial?.aideSommeil,
  );
  const [extinctionImmediate, setExtinctionImmediate] = useState<boolean | undefined>(
    initial?.extinctionImmediate,
  );
  const [heureMiseAuLit, setHeureMiseAuLit] = useState<string | undefined>(initial?.heureMiseAuLit);
  const [leverImmediat, setLeverImmediat] = useState<boolean | undefined>(initial?.leverImmediat);
  const [heureReveilFinal, setHeureReveilFinal] = useState<string | undefined>(
    initial?.heureReveilFinal,
  );

  const [detailsOuverts, setDetailsOuverts] = useState(false);
  const [nbReveils, setNbReveils] = useState<number | undefined>(initial?.reveils?.nombre);
  const [forme, setForme] = useState<number | undefined>(initial?.forme);
  const [sieste, setSieste] = useState<ClasseSieste | undefined>(initial?.siesteVeille);
  const [facteurs, setFacteurs] = useState<FacteursNuit>(initial?.facteurs ?? {});

  // Refus d'ORDRE des repères (réveil après la sortie du lit…), rendu SOUS LE
  // CADRAN, là où le patient est ramené et où se corrige l'erreur — et non sous
  // le bouton, que le défilement vers le cadran vient de faire sortir du champ.
  const [erreurOrdre, setErreurOrdre] = useState('');
  // Passe à vrai au premier envoi incomplet : les questions sans réponse sont
  // alors signalées une à une, jamais avant — on ne gronde pas un formulaire
  // qu'on vient d'ouvrir.
  const [tentative, setTentative] = useState(false);
  const ancres = useRef<Partial<Record<Bloc, HTMLDivElement | null>>>({});

  // CE QUI MANQUE, NOMMÉ, dans l'ordre de la page. Le bouton était désactivé
  // tant que la nuit était incomplète, et le message d'aide vivait dans le
  // gestionnaire de clic — qu'un bouton désactivé ne déclenche jamais : le
  // patient restait devant un bouton grisé, sans savoir quoi compléter. Le
  // bouton reste actif ; c'est cette liste qui garde la règle « rien ne part
  // sans un geste sur chaque réponse obligatoire ».
  //
  // Les deux heures conditionnelles ne sont requises que si leur question
  // l'appelle : sinon elles n'existent pas, elles ne valent pas zéro.
  const manquants: { bloc: Bloc; libelle: string }[] = [];
  if (heureCoucher === undefined && heureLever === undefined) {
    manquants.push({ bloc: 'cadran', libelle: 'les repères 🌑 et 🌅 du cadran' });
  } else if (heureCoucher === undefined) {
    manquants.push({ bloc: 'cadran', libelle: 'le repère 🌑 du cadran' });
  } else if (heureLever === undefined) {
    manquants.push({ bloc: 'cadran', libelle: 'le repère 🌅 du cadran' });
  }
  if (extinctionImmediate === false && heureMiseAuLit === undefined) {
    manquants.push({ bloc: 'cadran', libelle: 'le repère 🛏️ du cadran' });
  }
  if (leverImmediat === false && heureReveilFinal === undefined) {
    manquants.push({ bloc: 'cadran', libelle: 'le repère 👁️ du cadran' });
  }
  if (extinctionImmediate === undefined) manquants.push({ bloc: 'coucher', libelle: 'le coucher' });
  if (latence === undefined) manquants.push({ bloc: 'latence', libelle: 'l’endormissement' });
  if (dureeReveils === undefined) manquants.push({ bloc: 'nuit', libelle: 'la nuit' });
  if (aideSommeil === undefined) manquants.push({ bloc: 'aide', libelle: 'l’aide pour dormir' });
  if (leverImmediat === undefined) manquants.push({ bloc: 'lever', libelle: 'le lever' });
  if (qualite === undefined) manquants.push({ bloc: 'qualite', libelle: 'la qualité de la nuit' });
  const complet = manquants.length === 0;

  const blocManquant = (bloc: Bloc) =>
    (tentative && manquants.some((m) => m.bloc === bloc)) || (bloc === 'cadran' && erreurOrdre !== '');
  const classeBloc = (bloc: Bloc) =>
    `rounded-xl outline-none transition-shadow ${
      blocManquant(bloc) ? 'ring-2 ring-status-warning/60 ring-offset-4 ring-offset-surface' : ''
    }`;
  const ancre = (bloc: Bloc) => (el: HTMLDivElement | null) => {
    ancres.current[bloc] = el;
  };

  // Amène le patient à la question visée, focus sur son PREMIER CONTRÔLE (une
  // tuile, un repère) : un lecteur d'écran annonce alors un nom, pas tout le
  // bloc. `scrollIntoView` n'existe pas sous jsdom : l'appel est conditionnel.
  function allerA(bloc: Bloc) {
    const el = ancres.current[bloc];
    if (!el) return;
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const cible = el.querySelector<HTMLElement>('button, [role="slider"]') ?? el;
    cible.focus({ preventScroll: true });
  }

  function majHoraire(poignee: 'lit' | 'extinction' | 'reveil' | 'sortie', valeur: string) {
    // Un refus d'ordre porte sur les repères : en bouger un le rend caduc.
    setErreurOrdre('');
    if (poignee === 'lit') setHeureMiseAuLit(valeur);
    else if (poignee === 'extinction') setHeureCoucher(valeur);
    else if (poignee === 'reveil') setHeureReveilFinal(valeur);
    else setHeureLever(valeur);
  }

  // Revenir sur la réponse « immédiate » efface l'heure devenue sans objet : la
  // garder enverrait au serveur une nuit contradictoire, que la validation
  // refuse (et refuserait à raison — mieux vaut ne pas la produire).
  function majCoucher(immediate: boolean) {
    // Fait apparaître ou disparaître un repère : le refus d'ordre est caduc.
    setErreurOrdre('');
    setExtinctionImmediate(immediate);
    if (immediate) setHeureMiseAuLit(undefined);
  }

  function majLever(immediat: boolean) {
    setErreurOrdre('');
    setLeverImmediat(immediat);
    if (immediat) setHeureReveilFinal(undefined);
  }

  // « Rien de particulier » et les autres facteurs s'excluent : cocher l'un
  // décoche l'autre. C'est cette exclusivité qui rend un bloc vide lisible comme
  // « pas répondu » plutôt que comme « aucun facteur ».
  function basculerFacteur(cle: CleFacteur) {
    setFacteurs((f) => ({ ...f, rienDeParticulier: false, [cle]: !f[cle] }));
  }

  function basculerRien() {
    setFacteurs((f) => (f.rienDeParticulier ? {} : { rienDeParticulier: true }));
  }

  function soumettre() {
    if (!complet) {
      setTentative(true);
      allerA(manquants[0].bloc);
      return;
    }
    setErreurOrdre('');
    const reponses: NuitReponses = {
      heureCoucher: heureCoucher!,
      heureLever: heureLever!,
      latence: latence!,
      qualite: qualite!,
      reveils:
        nbReveils === undefined
          ? { dureeTotale: dureeReveils! }
          : { dureeTotale: dureeReveils!, nombre: nbReveils },
      aideSommeil: aideSommeil!,
      extinctionImmediate: extinctionImmediate!,
      leverImmediat: leverImmediat!,
    };
    if (extinctionImmediate === false) reponses.heureMiseAuLit = heureMiseAuLit!;
    if (leverImmediat === false) reponses.heureReveilFinal = heureReveilFinal!;
    if (forme !== undefined) reponses.forme = forme;
    if (sieste !== undefined) reponses.siesteVeille = sieste;
    // Un objet vide ne dit rien : on ne transmet les facteurs que si le patient
    // a coché quelque chose, « rien de particulier » compris.
    const facteursNets = Object.fromEntries(
      Object.entries(facteurs).filter(([, v]) => v === true),
    ) as FacteursNuit;
    if (Object.keys(facteursNets).length > 0) reponses.facteurs = facteursNets;
    // La validation d'ÉCRITURE du serveur, jouée ici avant l'envoi — la même
    // fonction, pas une copie. Une nuit complète peut encore être refusée pour
    // l'ordre de ses repères (réveil placé après la sortie du lit, par
    // exemple) : le dire ici, sous le bouton, plutôt qu'au retour d'un aller-
    // retour réseau, en tête d'une page que le patient a quittée des yeux.
    //
    // Une nuit COMPLÈTE ne peut échouer ici que sur l'ordre des repères : tout
    // le reste est garanti par construction du formulaire. Toute autre
    // `TypeError` signalerait un formulaire cassé — elle part alors au serveur,
    // qui la refuse et la dit sous le bouton, plutôt que d'être maquillée ici en
    // erreur de cadran.
    try {
      ensureNuitReponses(reponses, { exigerObligatoires: true });
    } catch (e) {
      if (!(e instanceof TypeError)) throw e;
      if (RE_REFUS_ORDRE.test(e.message)) {
        setErreurOrdre(`${e.message} Ajustez les repères du cadran.`);
        allerA('cadran');
        return;
      }
    }
    onSubmit(reponses);
  }

  return (
    <div className="space-y-6">
      <div ref={ancre('cadran')} tabIndex={-1} className={classeBloc('cadran')}>
      <CadranNuit
        extinction={heureCoucher}
        sortieDuLit={heureLever}
        miseAuLit={heureMiseAuLit}
        afficherMiseAuLit={extinctionImmediate === false}
        reveilFinal={heureReveilFinal}
        afficherReveilFinal={leverImmediat === false}
        suggestionExtinction={horairesHabituels.extinction}
        suggestionSortie={horairesHabituels.sortie}
        onChange={majHoraire}
      />
      {/* « Comme d'habitude » en UN geste pour les deux seules ancres
          suggérées. Le garde-fou de la v2 tient : chaque nuit exige un geste
          explicite, et rien d'autre n'est repris — ni latence, ni qualité, ni
          réveils. Les heures confirmées sont écrites sur le bouton : on
          confirme ce qu'on lit, pas une valeur cachée. Absent tant que le
          patient n'a pas de nuit à lui : les horaires par défaut ne sont pas
          les siens. */}
      {suggestionsPersonnelles && heureCoucher === undefined && heureLever === undefined && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setHeureCoucher(horairesHabituels.extinction);
              setHeureLever(horairesHabituels.sortie);
            }}
            className="min-h-11 rounded-xl border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10"
          >
            Confirmer ces horaires : 🌑 {horairesHabituels.extinction} → 🌅 {horairesHabituels.sortie}
          </button>
        </div>
      )}
      {erreurOrdre && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreurOrdre}
        </p>
      )}
      </div>

      {/* Obligatoire. Sans cette question, le temps passé au lit sans chercher à
          dormir est invisible et l'efficacité se calcule sur une fenêtre trop
          courte — donc plus flatteuse que celle de tout service appliquant la
          convention. Elle sépare aussi deux conduites opposées : lire une heure
          au lit relève du contrôle du stimulus, éteindre et ne pas s'endormir
          non. C'est la latence d'endormissement qui mesure la seconde. */}
      <div ref={ancre('coucher')} tabIndex={-1} className={classeBloc('coucher')}>
      <Puces<string>
        label={QUESTION_EXTINCTION}
        options={['immediate', 'differee']}
        libelle={(v) =>
          v === 'immediate' ? LABEL_EXTINCTION_IMMEDIATE : LABEL_EXTINCTION_DIFFEREE
        }
        aria={(v) => (v === 'immediate' ? ARIA_EXTINCTION_IMMEDIATE : ARIA_EXTINCTION_DIFFEREE)}
        value={
          extinctionImmediate === undefined ? undefined : extinctionImmediate ? 'immediate' : 'differee'
        }
        onChange={(v) => majCoucher(v === 'immediate')}
      />
      </div>
      {extinctionImmediate === false && heureMiseAuLit === undefined && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Placez le repère 🛏️ sur le cadran, à l’heure où vous vous êtes mis·e au lit.
        </p>
      )}

      <div ref={ancre('latence')} tabIndex={-1} className={classeBloc('latence')}>
      <Puces<ClasseLatence>
        label="Une fois la lumière éteinte, vous vous êtes endormi·e…"
        options={CLASSES_LATENCE}
        libelle={(v) => LABEL_LATENCE[v]}
        value={latence}
        onChange={setLatence}
      />
      </div>

      {/* Obligatoire depuis la v2. En v1 cette question vivait dans l'accordéon
          facultatif : une nuit sans réponse était agrégée comme « zéro minute
          éveillée », ce qui gonflait l'efficacité et récompensait la
          non-réponse. « Nuit continue » est désormais une réponse à part. */}
      <div ref={ancre('nuit')} tabIndex={-1} className={classeBloc('nuit')}>
      <Puces<ClasseDureeReveils>
        label="Votre nuit a été…"
        options={CLASSES_DUREE_REVEILS}
        libelle={(v) => LABEL_REVEILS_PATIENT[v]}
        aria={(v) => ARIA_REVEILS[v]}
        value={dureeReveils}
        onChange={(v) => {
          setDureeReveils(v);
          // Le compte suit toujours la classe. Le laisser à 0 après un
          // changement d'avis (« nuit continue » puis « éveillé·e longtemps »)
          // enverrait un compte qui contredit la durée déclarée — et le serveur
          // refuserait la nuit, à raison.
          setNbReveils(v === 'aucun' ? 0 : undefined);
        }}
      />
      </div>

      {/* Obligatoire : sans elle, une efficacité de 90 % sous hypnotique se lit
          comme une efficacité de 90 % sans rien, et une amélioration à J21 sous
          traitement instauré entre-temps passe pour une amélioration du sommeil.
          Le nom du produit reste au dossier médicamenteux — on ne le redemande
          pas chaque matin. */}
      <div ref={ancre('aide')} tabIndex={-1} className={classeBloc('aide')}>
      <Puces<ClasseAideSommeil>
        label="Pour cette nuit, vous avez pris…"
        aide={PORTEE_AIDE_SOMMEIL}
        options={CLASSES_AIDE_SOMMEIL}
        libelle={(v) => LABEL_AIDE_SOMMEIL[v]}
        aria={(v) => ARIA_AIDE_SOMMEIL[v]}
        value={aideSommeil}
        onChange={setAideSommeil}
      />
      </div>

      {/* Obligatoire : c'est la seule question qui rend visible le réveil matinal
          précoce. Sans elle, les minutes passées éveillé au lit le matin sont
          comptées comme du sommeil. La 3ᵉ poignée du cadran n'apparaît que si le
          patient est resté au lit — les autres ne la voient jamais. */}
      <div ref={ancre('lever')} tabIndex={-1} className={classeBloc('lever')}>
      <Puces<string>
        label={QUESTION_LEVER}
        options={['immediat', 'differe']}
        libelle={(v) => (v === 'immediat' ? LABEL_LEVER_IMMEDIAT : LABEL_LEVER_DIFFERE)}
        aria={(v) => (v === 'immediat' ? ARIA_LEVER_IMMEDIAT : ARIA_LEVER_DIFFERE)}
        value={leverImmediat === undefined ? undefined : leverImmediat ? 'immediat' : 'differe'}
        onChange={(v) => majLever(v === 'immediat')}
      />
      </div>
      {leverImmediat === false && heureReveilFinal === undefined && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Placez le repère 👁️ sur le cadran, à l’heure où vous vous êtes réveillé·e.
        </p>
      )}

      <div ref={ancre('qualite')} tabIndex={-1} className={classeBloc('qualite')}>
      <ChoixEmoji
        label="Cette nuit était…"
        emojis={EMOJI_QUALITE}
        aria={ARIA_QUALITE}
        value={qualite}
        onChange={setQualite}
      />
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setDetailsOuverts((v) => !v)}
          className="text-sm text-primary hover:underline"
          aria-expanded={detailsOuverts}
        >
          {detailsOuverts ? '− Masquer les détails' : '+ Ajouter des détails (facultatif)'}
        </button>
      </div>

      {detailsOuverts && (
        <div className="space-y-6">
          {/* Raffinement facultatif, proposé seulement si la nuit a été coupée :
              le compte n'entre dans aucun calcul structurel, donc son absence ne
              biaise rien — contrairement à la durée d'éveil, plus haut. Compte
              EXACT depuis la v3 (fini le « 3 ou plus ») : la fragmentation
              au-delà de trois réveils était invisible. */}
          {dureeReveils !== undefined && dureeReveils !== 'aucun' && (
            <Compteur
              label="Combien de fois, à peu près ?"
              value={nbReveils !== undefined && nbReveils > 0 ? nbReveils : undefined}
              max={NB_REVEILS_MAX}
              onChange={setNbReveils}
            />
          )}
          <ChoixEmoji
            label="Votre forme au réveil"
            emojis={EMOJI_FORME}
            aria={ARIA_FORME}
            value={forme}
            onChange={setForme}
          />
          <Puces<ClasseSieste>
            label="Sieste la veille"
            options={CLASSES_SIESTE}
            libelle={(v) => LABEL_SIESTE[v]}
            value={sieste}
            onChange={setSieste}
          />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">La veille au soir</p>
            <div className="flex flex-wrap gap-2">
              {CLES_FACTEURS.map((cle) => {
                const actif = facteurs[cle] === true;
                return (
                  <button
                    key={cle}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => basculerFacteur(cle)}
                    className={`min-h-11 rounded-xl px-4 py-2 text-sm border transition-colors ${
                      actif
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {LABEL_FACTEURS[cle]}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={facteurs.rienDeParticulier === true}
                onClick={basculerRien}
                className={`min-h-11 rounded-xl px-4 py-2 text-sm border transition-colors ${
                  facteurs.rienDeParticulier
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-dashed border-border hover:bg-muted'
                }`}
              >
                {LABEL_RIEN_DE_PARTICULIER}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sous le bouton qu'on vient de toucher, jamais en tête de page. Le refus
          local (ce qui manque) passe avant celui du serveur, qui date de
          l'envoi précédent. */}
      {/* La liste se recalcule à chaque geste : elle raccourcit à mesure que
          le patient complète, et disparaît quand il n'y a plus rien à faire.
          Annonce POLIE : assertive, chaque geste interromprait le lecteur
          d'écran. Le refus du serveur, lui, reste une alerte. */}
      {tentative && !complet ? (
        <p aria-live="polite" className="text-sm text-status-danger">
          {`Il reste à renseigner : ${enumerer(manquants.map((m) => m.libelle))}.`}
        </p>
      ) : (
        refus && (
          <p role="alert" className="text-sm text-status-danger">
            {refus}
          </p>
        )
      )}

      <PatientButton
        variant="primary"
        className="w-full"
        loading={submitting}
        loadingLabel="Enregistrement…"
        onClick={soumettre}
      >
        {ctaLabel}
      </PatientButton>
    </div>
  );
}
