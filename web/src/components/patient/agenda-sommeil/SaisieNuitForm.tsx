'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { CadranNuit } from './CadranNuit';
import {
  ARIA_AIDE_SOMMEIL,
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
} from '@/lib/agenda-sommeil/libelles';
import {
  CLASSES_AIDE_SOMMEIL,
  CLASSES_DUREE_REVEILS,
  CLASSES_LATENCE,
  CLASSES_SIESTE,
  CLES_FACTEURS,
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
    </div>
  );
}

function Puces<T extends string>({
  label,
  options,
  libelle,
  aria,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  libelle: (v: T) => string;
  aria?: (v: T) => string;
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
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

type Props = {
  // Renseigné UNIQUEMENT en correction d'une nuit déjà saisie. Jamais la nuit
  // de la veille : ce serait rouvrir la porte au report automatique.
  initial: NuitReponses | null;
  // Horaires habituels du patient (médianes des nuits précédentes) : position
  // d'ouverture des poignées, en pointillé, sans valeur tant qu'on n'y touche pas.
  horairesHabituels: { extinction: string; sortie: string };
  submitting: boolean;
  ctaLabel?: string;
  onSubmit: (reponses: NuitReponses) => void;
};

export function SaisieNuitForm({
  initial,
  horairesHabituels,
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

  const [erreur, setErreur] = useState('');

  // Les deux heures conditionnelles ne sont requises que si leur question
  // l'appelle : sinon elles n'existent pas, elles ne valent pas zéro.
  const complet =
    heureCoucher !== undefined &&
    heureLever !== undefined &&
    latence !== undefined &&
    qualite !== undefined &&
    dureeReveils !== undefined &&
    aideSommeil !== undefined &&
    extinctionImmediate !== undefined &&
    (extinctionImmediate === true || heureMiseAuLit !== undefined) &&
    leverImmediat !== undefined &&
    (leverImmediat === true || heureReveilFinal !== undefined);

  function majHoraire(poignee: 'lit' | 'extinction' | 'reveil' | 'sortie', valeur: string) {
    if (poignee === 'lit') setHeureMiseAuLit(valeur);
    else if (poignee === 'extinction') setHeureCoucher(valeur);
    else if (poignee === 'reveil') setHeureReveilFinal(valeur);
    else setHeureLever(valeur);
  }

  // Revenir sur la réponse « immédiate » efface l'heure devenue sans objet : la
  // garder enverrait au serveur une nuit contradictoire, que la validation
  // refuse (et refuserait à raison — mieux vaut ne pas la produire).
  function majCoucher(immediate: boolean) {
    setExtinctionImmediate(immediate);
    if (immediate) setHeureMiseAuLit(undefined);
  }

  function majLever(immediat: boolean) {
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
      setErreur(
        'Il manque un geste : les repères de la nuit, le coucher, l’endormissement, la nuit, l’aide au sommeil, le lever et la qualité.',
      );
      return;
    }
    setErreur('');
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
    onSubmit(reponses);
  }

  return (
    <div className="space-y-6">
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

      {/* Obligatoire. Sans cette question, le temps passé au lit sans chercher à
          dormir est invisible et l'efficacité se calcule sur une fenêtre trop
          courte — donc plus flatteuse que celle de tout service appliquant la
          convention. Elle sépare aussi deux conduites opposées : lire une heure
          au lit relève du contrôle du stimulus, éteindre et ne pas s'endormir
          non. C'est la latence d'endormissement qui mesure la seconde. */}
      <Puces<string>
        label="Vous avez éteint la lumière…"
        options={['immediate', 'differee']}
        libelle={(v) =>
          v === 'immediate' ? LABEL_EXTINCTION_IMMEDIATE : LABEL_EXTINCTION_DIFFEREE
        }
        value={
          extinctionImmediate === undefined ? undefined : extinctionImmediate ? 'immediate' : 'differee'
        }
        onChange={(v) => majCoucher(v === 'immediate')}
      />
      {extinctionImmediate === false && heureMiseAuLit === undefined && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Placez le repère 🛏️ sur le cadran, à l’heure où vous vous êtes mis·e au lit.
        </p>
      )}

      <Puces<ClasseLatence>
        label="Une fois la lumière éteinte, vous vous êtes endormi·e…"
        options={CLASSES_LATENCE}
        libelle={(v) => LABEL_LATENCE[v]}
        value={latence}
        onChange={setLatence}
      />

      {/* Obligatoire depuis la v2. En v1 cette question vivait dans l'accordéon
          facultatif : une nuit sans réponse était agrégée comme « zéro minute
          éveillée », ce qui gonflait l'efficacité et récompensait la
          non-réponse. « Nuit continue » est désormais une réponse à part. */}
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

      {/* Obligatoire : sans elle, une efficacité de 90 % sous hypnotique se lit
          comme une efficacité de 90 % sans rien, et une amélioration à J21 sous
          traitement instauré entre-temps passe pour une amélioration du sommeil.
          Le nom du produit reste au dossier médicamenteux — on ne le redemande
          pas chaque matin. */}
      <Puces<ClasseAideSommeil>
        label="Pour cette nuit, vous avez pris…"
        options={CLASSES_AIDE_SOMMEIL}
        libelle={(v) => LABEL_AIDE_SOMMEIL[v]}
        aria={(v) => ARIA_AIDE_SOMMEIL[v]}
        value={aideSommeil}
        onChange={setAideSommeil}
      />

      {/* Obligatoire : c'est la seule question qui rend visible le réveil matinal
          précoce. Sans elle, les minutes passées éveillé au lit le matin sont
          comptées comme du sommeil. La 3ᵉ poignée du cadran n'apparaît que si le
          patient est resté au lit — les autres ne la voient jamais. */}
      <Puces<string>
        label="Le matin, vous vous êtes levé·e…"
        options={['immediat', 'differe']}
        libelle={(v) => (v === 'immediat' ? LABEL_LEVER_IMMEDIAT : LABEL_LEVER_DIFFERE)}
        value={leverImmediat === undefined ? undefined : leverImmediat ? 'immediat' : 'differe'}
        onChange={(v) => majLever(v === 'immediat')}
      />
      {leverImmediat === false && heureReveilFinal === undefined && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Placez le repère 👁️ sur le cadran, à l’heure où vous vous êtes réveillé·e.
        </p>
      )}

      <ChoixEmoji
        label="Cette nuit était…"
        emojis={EMOJI_QUALITE}
        aria={ARIA_QUALITE}
        value={qualite}
        onChange={setQualite}
      />

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
              biaise rien — contrairement à la durée d'éveil, plus haut. */}
          {dureeReveils !== undefined && dureeReveils !== 'aucun' && (
            <Puces<string>
              label="Combien de fois, à peu près ?"
              options={['1', '2', '3']}
              libelle={(v) => (v === '3' ? '3 ou plus' : v)}
              value={nbReveils !== undefined && nbReveils > 0 ? String(nbReveils) : undefined}
              onChange={(v) => setNbReveils(Number(v))}
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

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <PatientButton
        variant="primary"
        className="w-full"
        loading={submitting}
        loadingLabel="Enregistrement…"
        disabled={!complet}
        onClick={soumettre}
      >
        {ctaLabel}
      </PatientButton>
    </div>
  );
}
