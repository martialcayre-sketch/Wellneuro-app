'use client';

import { useEffect, useRef, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { SelecteurHeure } from './SelecteurHeure';
import {
  ARIA_AIDE_SOMMEIL,
  ARIA_EXTINCTION_DIFFEREE,
  ARIA_EXTINCTION_IMMEDIATE,
  ARIA_LEVER_DIFFERE,
  ARIA_LEVER_IMMEDIAT,
  ARIA_QUALITE,
  ARIA_FORME,
  ARIA_REVEILS,
  BORNES_REVEILS_PATIENT,
  EMOJI_FORME,
  EMOJI_QUALITE,
  LABEL_AIDE_SOMMEIL,
  LABEL_EXTINCTION,
  LABEL_FACTEURS,
  LABEL_LATENCE,
  LABEL_EXTINCTION_DIFFEREE,
  LABEL_EXTINCTION_IMMEDIATE,
  LABEL_LEVER_DIFFERE,
  LABEL_LEVER_IMMEDIAT,
  LABEL_MISE_AU_LIT,
  LABEL_REVEIL_FINAL,
  LABEL_REVEILS_PATIENT,
  LABEL_RIEN_DE_PARTICULIER,
  LABEL_SIESTE,
  LABEL_SORTIE_DU_LIT,
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

// Saisie d'une nuit — SANS CLAVIER À TAPER, en TROIS ÉCRANS : le soir, la nuit,
// le matin. Chaque écran tient sur un téléphone ; « Continuer » ne passe au
// suivant que si l'écran est complet, et nomme sinon ce qui manque.
//
// Les heures se choisissent dans des listes au quart d'heure (`SelecteurHeure`),
// qui remplacent le cadran circulaire de la v2 : le cadran demandait
// d'apprendre un geste pour donner une heure familière, et ses poignées en
// pointillé semblaient renseignées sans l'être (LOT-03 de la campagne
// 2026-10-07-agenda-sommeil-adhesion).
//
// Réponses obligatoires : l'extinction, le mode de coucher, l'endormissement,
// la nuit (continue ou coupée), l'aide au sommeil, le lever, le mode de lever et
// la qualité — huit. Deux heures supplémentaires ne sont demandées que si le
// patient déclare du temps au lit éveillé, le soir ou le matin. Le reste est
// facultatif et replié. C'est le prix de la couverture du noyau du Consensus
// Sleep Diary : chacune des questions ajoutées en v2 comble un angle mort qui
// rendait une métrique fausse plutôt qu'imprécise.
//
// RIEN N'EST PRÉ-COCHÉ. En v1 le formulaire s'ouvrait pré-rempli avec la nuit de
// la veille — latence et qualité comprises — et le bouton d'envoi était actif
// sans un seul geste : on pouvait valider vingt copies conformes de sa première
// nuit. Les horaires habituels ne sont qu'une proposition, confirmée par un
// geste explicite (« Confirmer ces horaires »).

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
  detail,
  aria,
  value,
  onChange,
}: {
  label: string;
  aide?: string;
  options: readonly T[];
  libelle: (v: T) => string;
  // Seconde ligne discrète sous le libellé d'une tuile (ordre de grandeur).
  detail?: (v: T) => string;
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
              className={`min-h-11 rounded-xl px-4 py-2 text-sm border text-left transition-colors ${
                actif
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:bg-muted'
              }`}
            >
              {libelle(opt)}
              {detail && (
                <span
                  className={`block text-xs ${actif ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                >
                  {detail(opt)}
                </span>
              )}
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

// Les trois écrans, dans l'ordre de la nuit. La numérotation affichée (« 1 sur
// 3 ») dit une séquence réelle : le patient remonte sa nuit du soir au matin.
const ETAPES = [
  { cle: 'soir', titre: 'Le soir' },
  { cle: 'nuit', titre: 'Pendant la nuit' },
  { cle: 'matin', titre: 'Le matin' },
] as const;
type Etape = 0 | 1 | 2;

// Les blocs vers lesquels un envoi incomplet ramène le patient, avec l'écran
// qui les porte.
type Bloc =
  | 'extinction'
  | 'coucher'
  | 'miseAuLit'
  | 'latence'
  | 'nuit'
  | 'aide'
  | 'sortie'
  | 'lever'
  | 'reveilFinal'
  | 'qualite';
const ETAPE_DU_BLOC: Record<Bloc, Etape> = {
  extinction: 0,
  coucher: 0,
  miseAuLit: 0,
  latence: 0,
  nuit: 1,
  aide: 1,
  sortie: 2,
  lever: 2,
  reveilFinal: 2,
  qualite: 2,
};

// Les trois refus d'ORDRE de `ensureNuitReponses` (lib/agenda-sommeil/nuit.ts,
// mode écriture), figés par un banc dans nuit.test.ts. Le premier porte sur
// l'extinction et la mise au lit, et se corrige le soir ; les deux autres
// portent sur l'heure du réveil, le matin.
const RE_REFUS_ORDRE = /doit (suivre|se situer)/;
const RE_REFUS_ORDRE_DU_SOIR = /^L’extinction doit suivre/;

// « a », « a et b », « a, b et c ».
function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

type Props = {
  // Renseigné UNIQUEMENT en correction d'une nuit déjà saisie. Jamais la nuit
  // de la veille : ce serait rouvrir la porte au report automatique.
  initial: NuitReponses | null;
  // Horaires habituels du patient (médianes des nuits précédentes), proposés
  // par « Confirmer ces horaires » — jamais posés sans ce geste.
  horairesHabituels: { extinction: string; sortie: string };
  // Vrai seulement si ces horaires viennent des nuits DU PATIENT. Sur les
  // horaires par défaut (aucune nuit encore), « confirmer ces horaires »
  // ferait valider en un geste une heure que personne n'a donnée.
  suggestionsPersonnelles?: boolean;
  // Refus du serveur, rendu À CÔTÉ DU BOUTON d'envoi.
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

  const [etape, setEtape] = useState<Etape>(0);
  // Refus d'ORDRE des heures (réveil après la sortie du lit…), rendu en tête de
  // l'écran qui porte l'heure à corriger — là où le patient est ramené.
  const [erreurOrdre, setErreurOrdre] = useState('');
  // Écrans dont « Continuer » (ou l'envoi) a déjà été tenté incomplet : leurs
  // questions sans réponse sont alors signalées, jamais avant — on ne gronde
  // pas un écran qu'on vient d'ouvrir.
  const [tentees, setTentees] = useState<ReadonlySet<Etape>>(new Set());
  const ancres = useRef<Partial<Record<Bloc, HTMLDivElement | null>>>({});
  const titreRef = useRef<HTMLHeadingElement | null>(null);
  const etapeAnnoncee = useRef<Etape>(etape);

  // Un nouvel écran s'annonce : focus sur son titre (un lecteur d'écran le lit)
  // et retour en haut (sur téléphone, la page restait défilée en bas, sur les
  // boutons). Seulement sur un VRAI changement d'écran — jamais à l'ouverture,
  // ni au double montage du mode strict. `allerA`, qui vise une question
  // précise, passe après et l'emporte.
  useEffect(() => {
    if (etapeAnnoncee.current === etape) return;
    etapeAnnoncee.current = etape;
    titreRef.current?.scrollIntoView?.({ block: 'start' });
    titreRef.current?.focus({ preventScroll: true });
  }, [etape]);

  // CE QUI MANQUE, NOMMÉ, dans l'ordre de la nuit. Le bouton d'envoi est
  // toujours actif ; c'est cette liste qui garde la règle « rien ne part sans un
  // geste sur chaque réponse obligatoire ». Les deux heures conditionnelles ne
  // sont requises que si leur question l'appelle : sinon elles n'existent pas,
  // elles ne valent pas zéro.
  const manquants: { bloc: Bloc; libelle: string }[] = [];
  if (heureCoucher === undefined) {
    manquants.push({ bloc: 'extinction', libelle: 'l’heure où vous avez éteint 🌑' });
  }
  if (extinctionImmediate === undefined) manquants.push({ bloc: 'coucher', libelle: 'le coucher' });
  if (extinctionImmediate === false && heureMiseAuLit === undefined) {
    manquants.push({ bloc: 'miseAuLit', libelle: 'l’heure du coucher 🛏️' });
  }
  if (latence === undefined) manquants.push({ bloc: 'latence', libelle: 'l’endormissement' });
  if (dureeReveils === undefined) manquants.push({ bloc: 'nuit', libelle: 'la nuit' });
  if (aideSommeil === undefined) manquants.push({ bloc: 'aide', libelle: 'l’aide pour dormir' });
  if (heureLever === undefined) {
    manquants.push({ bloc: 'sortie', libelle: 'l’heure du lever 🌅' });
  }
  if (leverImmediat === undefined) manquants.push({ bloc: 'lever', libelle: 'le lever' });
  if (leverImmediat === false && heureReveilFinal === undefined) {
    manquants.push({ bloc: 'reveilFinal', libelle: 'l’heure du réveil 👁️' });
  }
  if (qualite === undefined) manquants.push({ bloc: 'qualite', libelle: 'la qualité de la nuit' });

  const manquantsDe = (e: Etape) => manquants.filter((m) => ETAPE_DU_BLOC[m.bloc] === e);
  const manquantsEtape = manquantsDe(etape);
  const signale = (bloc: Bloc) =>
    tentees.has(ETAPE_DU_BLOC[bloc]) && manquants.some((m) => m.bloc === bloc);
  const classeBloc = (bloc: Bloc) =>
    `rounded-xl outline-none transition-shadow ${
      signale(bloc) ? 'ring-2 ring-status-warning/60 ring-offset-4 ring-offset-surface' : ''
    }`;
  const ancre = (bloc: Bloc) => (el: HTMLDivElement | null) => {
    ancres.current[bloc] = el;
  };

  // Amène le patient à la question visée, focus sur son PREMIER CONTRÔLE (une
  // liste, une tuile) : un lecteur d'écran annonce alors un nom, pas tout le
  // bloc. Le bloc peut n'être rendu qu'après un changement d'écran : on attend
  // le rendu suivant. `scrollIntoView` n'existe pas sous jsdom.
  function allerA(bloc: Bloc) {
    const viser = () => {
      const el = ancres.current[bloc];
      if (!el) return;
      el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      const cible = el.querySelector<HTMLElement>('select, button') ?? el;
      cible.focus({ preventScroll: true });
    };
    if (ETAPE_DU_BLOC[bloc] === etape) viser();
    else {
      setEtape(ETAPE_DU_BLOC[bloc]);
      setTimeout(viser, 0);
    }
  }

  function marquerTentee(e: Etape) {
    setTentees((t) => (t.has(e) ? t : new Set(t).add(e)));
  }

  function continuer() {
    if (manquantsEtape.length > 0) {
      marquerTentee(etape);
      allerA(manquantsEtape[0].bloc);
      return;
    }
    setEtape((e) => (e < 2 ? ((e + 1) as Etape) : e));
  }

  // Toute heure qui bouge, ou tout repère qui apparaît ou disparaît, rend
  // caduc un refus d'ordre.
  function majHeure(setter: (v: string) => void) {
    return (v: string) => {
      setErreurOrdre('');
      setter(v);
    };
  }

  // Revenir sur la réponse « au même moment » efface l'heure devenue sans
  // objet : la garder enverrait au serveur une nuit contradictoire, que la
  // validation refuse (et refuserait à raison — mieux vaut ne pas la produire).
  function majCoucher(immediate: boolean) {
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
    if (manquants.length > 0) {
      marquerTentee(ETAPE_DU_BLOC[manquants[0].bloc]);
      marquerTentee(etape);
      allerA(manquants[0].bloc);
      return;
    }
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
    // fonction, pas une copie. Une nuit complète ne peut échouer ici que sur
    // l'ordre de ses heures ; toute autre `TypeError` signalerait un formulaire
    // cassé — elle part alors au serveur, qui la refuse et la dit sous le bouton.
    try {
      ensureNuitReponses(reponses, { exigerObligatoires: true });
    } catch (e) {
      if (!(e instanceof TypeError)) throw e;
      if (RE_REFUS_ORDRE.test(e.message)) {
        setErreurOrdre(`${e.message} Ajustez les heures.`);
        allerA(RE_REFUS_ORDRE_DU_SOIR.test(e.message) ? 'extinction' : 'reveilFinal');
        return;
      }
    }
    onSubmit(reponses);
  }

  const alerteOrdre = erreurOrdre ? (
    <p role="alert" className="text-sm text-status-danger">
      {erreurOrdre}
    </p>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h3
          ref={titreRef}
          tabIndex={-1}
          className="font-display text-base font-semibold text-foreground outline-none"
        >
          {ETAPES[etape].titre}
        </h3>
        <span className="text-xs text-muted-foreground">
          {etape + 1} sur {ETAPES.length}
        </span>
      </div>

      {etape === 0 && (
        <>
          {alerteOrdre}
          {/* « Comme d'habitude » en UN geste pour les deux seules heures
              suggérées. Le garde-fou de la v2 tient : chaque nuit exige un
              geste explicite, et rien d'autre n'est repris — ni latence, ni
              qualité, ni réveils. Les heures confirmées sont écrites sur le
              bouton : on confirme ce qu'on lit. Absent tant que le patient n'a
              pas de nuit à lui : les horaires par défaut ne sont pas les siens. */}
          {suggestionsPersonnelles && heureCoucher === undefined && heureLever === undefined && (
            <button
              type="button"
              onClick={() => {
                setErreurOrdre('');
                setHeureCoucher(horairesHabituels.extinction);
                setHeureLever(horairesHabituels.sortie);
              }}
              className="min-h-11 rounded-xl border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10"
            >
              Confirmer ces horaires : 🌑 {horairesHabituels.extinction} → 🌅 {horairesHabituels.sortie}
            </button>
          )}

          <div ref={ancre('extinction')} tabIndex={-1} className={classeBloc('extinction')}>
            <SelecteurHeure
              id="agenda-heure-extinction"
              label={`🌑 ${LABEL_EXTINCTION} à`}
              valeur={heureCoucher}
              heureDebut={18}
              onChange={majHeure(setHeureCoucher)}
            />
          </div>

          {/* Obligatoire. Sans cette question, le temps passé au lit sans
              chercher à dormir est invisible et l'efficacité se calcule sur une
              fenêtre trop courte — donc plus flatteuse que celle de tout service
              appliquant la convention. */}
          <div ref={ancre('coucher')} tabIndex={-1} className={classeBloc('coucher')}>
            <Puces<string>
              label={QUESTION_EXTINCTION}
              options={['immediate', 'differee']}
              libelle={(v) =>
                v === 'immediate' ? LABEL_EXTINCTION_IMMEDIATE : LABEL_EXTINCTION_DIFFEREE
              }
              aria={(v) => (v === 'immediate' ? ARIA_EXTINCTION_IMMEDIATE : ARIA_EXTINCTION_DIFFEREE)}
              value={
                extinctionImmediate === undefined
                  ? undefined
                  : extinctionImmediate
                    ? 'immediate'
                    : 'differee'
              }
              onChange={(v) => majCoucher(v === 'immediate')}
            />
          </div>

          {extinctionImmediate === false && (
            <div ref={ancre('miseAuLit')} tabIndex={-1} className={classeBloc('miseAuLit')}>
              <SelecteurHeure
                id="agenda-heure-mise-au-lit"
                label={`🛏️ ${LABEL_MISE_AU_LIT} à`}
                valeur={heureMiseAuLit}
                heureDebut={18}
                onChange={majHeure(setHeureMiseAuLit)}
              />
            </div>
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
        </>
      )}

      {etape === 1 && (
        <>
          {/* Obligatoire depuis la v2. En v1 cette question vivait dans
              l'accordéon facultatif : une nuit sans réponse était agrégée comme
              « zéro minute éveillée ». « Nuit continue » est une réponse à part.
              L'ordre de grandeur s'affiche sous chaque tuile : la classe mesure
              une DURÉE cumulée, pas un nombre de réveils. */}
          <div ref={ancre('nuit')} tabIndex={-1} className={classeBloc('nuit')}>
            <Puces<ClasseDureeReveils>
              label="Votre nuit a été…"
              options={CLASSES_DUREE_REVEILS}
              libelle={(v) => LABEL_REVEILS_PATIENT[v]}
              detail={(v) => BORNES_REVEILS_PATIENT[v]}
              aria={(v) => ARIA_REVEILS[v]}
              value={dureeReveils}
              onChange={(v) => {
                setDureeReveils(v);
                // Le compte suit toujours la classe. Le laisser à 0 après un
                // changement d'avis enverrait un compte qui contredit la durée
                // déclarée — et le serveur refuserait la nuit, à raison.
                setNbReveils(v === 'aucun' ? 0 : undefined);
              }}
            />
          </div>

          {/* Raffinement facultatif, proposé seulement si la nuit a été
              coupée : le compte n'entre dans aucun calcul structurel, donc son
              absence ne biaise rien. Compte EXACT depuis la v3. */}
          {dureeReveils !== undefined && dureeReveils !== 'aucun' && (
            <Compteur
              label="Combien de fois, à peu près ? (facultatif)"
              value={nbReveils !== undefined && nbReveils > 0 ? nbReveils : undefined}
              max={NB_REVEILS_MAX}
              onChange={setNbReveils}
            />
          )}

          {/* Obligatoire : sans elle, une efficacité de 90 % sous hypnotique se
              lit comme une efficacité de 90 % sans rien. Le nom du produit reste
              au dossier médicamenteux. */}
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
        </>
      )}

      {etape === 2 && (
        <>
          {alerteOrdre}
          <div ref={ancre('sortie')} tabIndex={-1} className={classeBloc('sortie')}>
            <SelecteurHeure
              id="agenda-heure-sortie"
              label={`🌅 ${LABEL_SORTIE_DU_LIT} à`}
              valeur={heureLever}
              heureDebut={3}
              onChange={majHeure(setHeureLever)}
            />
          </div>

          {/* Obligatoire : c'est la seule question qui rend visible le réveil
              matinal précoce. Sans elle, les minutes passées éveillé au lit le
              matin sont comptées comme du sommeil. */}
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

          {leverImmediat === false && (
            <div ref={ancre('reveilFinal')} tabIndex={-1} className={classeBloc('reveilFinal')}>
              <SelecteurHeure
                id="agenda-heure-reveil"
                label={`👁️ ${LABEL_REVEIL_FINAL} à`}
                valeur={heureReveilFinal}
                heureDebut={3}
                onChange={majHeure(setHeureReveilFinal)}
              />
            </div>
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
        </>
      )}

      {/* Ce qui manque à l'écran courant, sous le bouton qu'on vient de
          toucher. La liste se recalcule à chaque geste et disparaît quand
          l'écran est complet. Annonce POLIE : assertive, chaque geste
          interromprait le lecteur d'écran. Le refus du serveur reste une
          alerte. */}
      {tentees.has(etape) && manquantsEtape.length > 0 ? (
        <p aria-live="polite" className="text-sm text-status-danger">
          {`Il reste à renseigner : ${enumerer(manquantsEtape.map((m) => m.libelle))}.`}
        </p>
      ) : (
        etape === 2 &&
        refus && (
          <p role="alert" className="text-sm text-status-danger">
            {refus}
          </p>
        )
      )}

      <div className="flex gap-3">
        {etape > 0 && (
          <PatientButton
            variant="ghost"
            className="flex-1"
            onClick={() => setEtape((e) => (e > 0 ? ((e - 1) as Etape) : e))}
          >
            Retour
          </PatientButton>
        )}
        {etape < 2 ? (
          // Clés distinctes : sans elles React réutilise le même bouton, et un
          // double appui sur « Continuer » de l'écran 2 envoyait la nuit.
          <PatientButton key="continuer" variant="primary" className="flex-1" onClick={continuer}>
            Continuer
          </PatientButton>
        ) : (
          <PatientButton
            key="envoyer"
            variant="primary"
            className="flex-1"
            loading={submitting}
            loadingLabel="Enregistrement…"
            onClick={soumettre}
          >
            {ctaLabel}
          </PatientButton>
        )}
      </div>
    </div>
  );
}
