'use client';

import { useEffect, useId, useState } from 'react';
import {
  CHAMPS_DECLARATION,
  CONTEXTE_INCONNU,
  LIBELLES_CHAMP,
  validerContextePrelevement,
  type ContextePrelevementSaisi,
  type Declaration,
  type Etat,
  type UniteDelai,
} from '@/lib/biology-library/contextePrelevement';
import {
  LIBELLES_CRITERE,
  LIBELLES_NATURE,
  LIBELLES_REPONSE,
  LIBELLES_SOURCE_PRATICIEN,
  NON_RENSEIGNE,
  type Critere,
} from '@/lib/physio-traitements/liste';
import type { PhysioTraitementsGetResponse } from '@/app/api/praticien/physio-traitements/route';

// LE CONTEXTE DU PRÉLÈVEMENT, SAISI UNE FOIS ([[D-497]] §4, BP-05) : à la
// saisie d'un bilan et à la validation d'un import, pour toutes les mesures
// du prélèvement. Chaque champ part à « inconnu » et y reste tant que le
// praticien ne le sait pas — « inconnu » est écrit, jamais un blanc.
//
// Aucun texte libre, aucune catégorie : cinq déclarations oui/non/inconnu,
// un jour du cycle (entier à partir de 1), un délai depuis la dernière prise
// (entier positif ou nul, en heures ou en jours). Aucune borne haute, aucun
// verdict de conformité (§2).
//
// À CÔTÉ, les déclarations du dossier (BP-13, [[D-335]]) : en lecture seule,
// datées, sous leur propre drapeau (la route répond 503 s'il est éteint, et
// l'encart se tait). Elles ne préremplissent RIEN : une déclaration faite à
// une autre date ne dit pas l'état au prélèvement (§3, arbitrage du
// responsable du 2026-11-12).

export type BrouillonContexte = {
  aJeun: Declaration;
  supplementationArretee: Declaration;
  traitementInterferent: Declaration;
  episodeInflammatoire: Declaration;
  grossesse: Declaration;
  jourCycleEtat: Etat;
  jourCycle: string;
  delaiDernierePriseEtat: Etat;
  delaiDernierePrise: string;
  delaiDernierePriseUnite: UniteDelai;
};

export const BROUILLON_INCONNU: Readonly<BrouillonContexte> = Object.freeze({
  aJeun: 'inconnu',
  supplementationArretee: 'inconnu',
  traitementInterferent: 'inconnu',
  episodeInflammatoire: 'inconnu',
  grossesse: 'inconnu',
  jourCycleEtat: 'inconnu',
  jourCycle: '',
  delaiDernierePriseEtat: 'inconnu',
  delaiDernierePrise: '',
  delaiDernierePriseUnite: 'heure',
});

const ENTIER = /^\d+$/;

/**
 * Le contexte à envoyer, ou `null` tant qu'un champ renseigné n'a pas de
 * valeur lisible : l'envoi attend, plutôt que de dire « inconnu » à la place
 * du praticien. La forme finale est celle du serveur (même module).
 */
export function contexteDuBrouillon(b: BrouillonContexte): ContextePrelevementSaisi | null {
  const jour = b.jourCycleEtat === 'renseigne' ? b.jourCycle.trim() : '';
  const delai = b.delaiDernierePriseEtat === 'renseigne' ? b.delaiDernierePrise.trim() : '';
  if (b.jourCycleEtat === 'renseigne' && !ENTIER.test(jour)) return null;
  if (b.delaiDernierePriseEtat === 'renseigne' && !ENTIER.test(delai)) return null;
  const verdict = validerContextePrelevement({
    aJeun: b.aJeun,
    supplementationArretee: b.supplementationArretee,
    traitementInterferent: b.traitementInterferent,
    episodeInflammatoire: b.episodeInflammatoire,
    grossesse: b.grossesse,
    jourCycleEtat: b.jourCycleEtat,
    jourCycle: b.jourCycleEtat === 'renseigne' ? Number(jour) : null,
    delaiDernierePriseEtat: b.delaiDernierePriseEtat,
    delaiDernierePrise: b.delaiDernierePriseEtat === 'renseigne' ? Number(delai) : null,
    delaiDernierePriseUnite: b.delaiDernierePriseEtat === 'renseigne' ? b.delaiDernierePriseUnite : null,
  });
  return verdict.ok ? verdict.contexte : null;
}

const TROP_GRAND = 'Ce nombre est trop grand pour être enregistré.';

/**
 * Pourquoi un champ renseigné retient l'envoi, dit sous le champ : sans ce
 * message, le bouton d'enregistrement resterait fermé sans explication (revue
 * PR-Agent et `wn-reviewer` de la PR 3). La capacité de la base se juge par
 * le validateur du serveur, pas par un nombre recopié ici.
 */
export function messageJourCycle(b: BrouillonContexte): string | null {
  if (b.jourCycleEtat !== 'renseigne') return null;
  const t = b.jourCycle.trim();
  if (t === '') return 'Saisissez le jour du cycle, ou choisissez « Inconnu ».';
  if (!ENTIER.test(t) || Number(t) < 1) return 'Un nombre entier, à partir de 1.';
  const verdict = validerContextePrelevement({ ...CONTEXTE_INCONNU, jourCycleEtat: 'renseigne', jourCycle: Number(t) });
  return verdict.ok ? null : TROP_GRAND;
}

export function messageDelai(b: BrouillonContexte): string | null {
  if (b.delaiDernierePriseEtat !== 'renseigne') return null;
  const t = b.delaiDernierePrise.trim();
  if (t === '') return 'Saisissez le délai, ou choisissez « Inconnu ».';
  if (!ENTIER.test(t)) return 'Un nombre entier, à partir de 0.';
  const verdict = validerContextePrelevement({
    ...CONTEXTE_INCONNU,
    delaiDernierePriseEtat: 'renseigne',
    delaiDernierePrise: Number(t),
    delaiDernierePriseUnite: b.delaiDernierePriseUnite,
  });
  return verdict.ok ? null : TROP_GRAND;
}

const OPTIONS_DECLARATION: Array<{ valeur: Declaration; libelle: string }> = [
  { valeur: 'oui', libelle: 'Oui' },
  { valeur: 'non', libelle: 'Non' },
  { valeur: 'inconnu', libelle: 'Inconnu' },
];

const OPTIONS_ETAT: Array<{ valeur: Etat; libelle: string }> = [
  { valeur: 'inconnu', libelle: 'Inconnu' },
  { valeur: 'renseigne', libelle: 'Renseigné' },
];

const CLASSE_OPTION =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring';

function Choix<V extends string>({
  nom,
  legende,
  options,
  valeur,
  onChange,
  disabled,
}: {
  nom: string;
  legende: string;
  options: Array<{ valeur: V; libelle: string }>;
  valeur: V;
  onChange: (v: V) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="mt-2">
      <legend className="text-xs text-muted-foreground">{legende}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map(option => (
          <label key={option.valeur} className={CLASSE_OPTION}>
            <input
              type="radio"
              name={nom}
              value={option.valeur}
              checked={valeur === option.valeur}
              onChange={() => onChange(option.valeur)}
              disabled={disabled}
              className="h-4 w-4"
            />
            {option.libelle}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BlocContextePrelevement({
  idPatient,
  valeur,
  onChange,
  disabled,
}: {
  idPatient: string;
  valeur: BrouillonContexte;
  onChange: (brouillon: BrouillonContexte) => void;
  disabled: boolean;
}) {
  const id = useId();
  const modifier = <K extends keyof BrouillonContexte>(champ: K, v: BrouillonContexte[K]) =>
    onChange({ ...valeur, [champ]: v });
  const erreurJour = messageJourCycle(valeur);
  const erreurDelai = messageDelai(valeur);

  return (
    <fieldset className="mt-3 rounded-lg border border-border p-3" data-testid="bloc-contexte-prelevement">
      <legend className="px-1 text-xs font-medium text-foreground">Contexte du prélèvement</legend>
      <p className="text-xs text-muted-foreground">
        Il vaut pour toutes les mesures de ce prélèvement. Chaque champ reste « inconnu » tant que vous ne le
        savez pas.
      </p>

      {CHAMPS_DECLARATION.map(champ => (
        <Choix
          key={champ}
          nom={`${id}-${champ}`}
          legende={LIBELLES_CHAMP[champ]}
          options={OPTIONS_DECLARATION}
          valeur={valeur[champ]}
          onChange={v => modifier(champ, v)}
          disabled={disabled}
        />
      ))}

      <Choix
        nom={`${id}-jour-cycle`}
        legende={LIBELLES_CHAMP.jourCycle}
        options={OPTIONS_ETAT}
        valeur={valeur.jourCycleEtat}
        onChange={v => onChange({ ...valeur, jourCycleEtat: v, jourCycle: v === 'inconnu' ? '' : valeur.jourCycle })}
        disabled={disabled}
      />
      {valeur.jourCycleEtat === 'renseigne' && (
        <div className="mt-1">
          <label className="block text-xs text-muted-foreground" htmlFor={`${id}-jour-cycle-valeur`}>
            Jour du cycle (à partir de 1)
          </label>
          <input
            id={`${id}-jour-cycle-valeur`}
            type="text"
            inputMode="numeric"
            value={valeur.jourCycle}
            onChange={event => modifier('jourCycle', event.target.value)}
            disabled={disabled}
            aria-invalid={erreurJour ? true : undefined}
            aria-describedby={erreurJour ? `${id}-jour-cycle-erreur` : undefined}
            className="min-h-11 w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {erreurJour && (
            <p id={`${id}-jour-cycle-erreur`} className="mt-1 text-xs text-status-danger">
              {erreurJour}
            </p>
          )}
        </div>
      )}

      <Choix
        nom={`${id}-delai`}
        legende={LIBELLES_CHAMP.delaiDernierePrise}
        options={OPTIONS_ETAT}
        valeur={valeur.delaiDernierePriseEtat}
        onChange={v =>
          onChange({
            ...valeur,
            delaiDernierePriseEtat: v,
            delaiDernierePrise: v === 'inconnu' ? '' : valeur.delaiDernierePrise,
          })
        }
        disabled={disabled}
      />
      {valeur.delaiDernierePriseEtat === 'renseigne' && (
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor={`${id}-delai-valeur`}>
              Délai (nombre entier)
            </label>
            <input
              id={`${id}-delai-valeur`}
              type="text"
              inputMode="numeric"
              value={valeur.delaiDernierePrise}
              onChange={event => modifier('delaiDernierePrise', event.target.value)}
              disabled={disabled}
              aria-invalid={erreurDelai ? true : undefined}
              aria-describedby={erreurDelai ? `${id}-delai-erreur` : undefined}
              className="min-h-11 w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor={`${id}-delai-unite`}>
              Unité
            </label>
            <select
              id={`${id}-delai-unite`}
              value={valeur.delaiDernierePriseUnite}
              onChange={event => modifier('delaiDernierePriseUnite', event.target.value as UniteDelai)}
              disabled={disabled}
              className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="heure">heures</option>
              <option value="jour">jours</option>
            </select>
          </div>
          {erreurDelai && (
            <p id={`${id}-delai-erreur`} className="w-full text-xs text-status-danger">
              {erreurDelai}
            </p>
          )}
        </div>
      )}

      <DeclarationsDuDossier idPatient={idPatient} />
    </fieldset>
  );
}

type DonneesPhysio = Extract<PhysioTraitementsGetResponse, { ok: true }>;

const estObjet = (v: unknown): boolean => typeof v === 'object' && v !== null;

const CRITERES_A_COTE: readonly Critere[] =['sexe_declare', 'statut_menstruel', 'grossesse'];

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Les déclarations BP-13 du dossier, À CÔTÉ du contexte, en lecture seule.
 * Silencieux si la route ne les sert pas (drapeau éteint, dossier mineur,
 * erreur) : leur absence n'empêche pas de saisir le contexte.
 */
function DeclarationsDuDossier({ idPatient }: { idPatient: string }) {
  const [donnees, setDonnees] = useState<DonneesPhysio | null>(null);
  // Deux blocs peuvent cohabiter (saisie de bilan et import à décider) : un
  // identifiant tiré du dossier serait dupliqué.
  const idTitre = useId();

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const reponse = await fetch(`/api/praticien/physio-traitements?idPatient=${encodeURIComponent(idPatient)}`);
        if (!reponse.ok) return;
        const corps = (await reponse.json()) as PhysioTraitementsGetResponse;
        // La forme se vérifie avant d'être lue : une réponse inattendue tait
        // l'encart, elle ne casse pas la saisie qu'il accompagne.
        // Élément par élément aussi : un `null` dans un tableau, ou une tête
        // qui n'est pas un objet, ferait lever le rendu et emporterait le bloc
        // entier (revue `wn-reviewer` de la PR 3, constat 4).
        if (
          vivant
          && corps.ok
          && !corps.mineur
          && Array.isArray(corps.criteres)
          && Array.isArray(corps.traitements)
        ) {
          setDonnees({
            ...corps,
            criteres: corps.criteres.filter(c => estObjet(c) && (c.tete === null || estObjet(c.tete))),
            traitements: corps.traitements.filter(f => estObjet(f) && (f.tete === null || estObjet(f.tete))),
          });
        }
      } catch {
        // Silence : l'encart est un appui, pas une condition de la saisie.
      }
    })();
    return () => {
      vivant = false;
    };
  }, [idPatient]);

  if (!donnees) return null;

  const traitements = donnees.traitements
    .map(f => f.tete)
    .filter((t): t is NonNullable<typeof t> => t !== null && t.acte === 'pose' && t.finPrecision === null);

  return (
    <section
      className="mt-3 rounded-lg bg-muted/40 p-2"
      aria-labelledby={idTitre}
      data-testid="declarations-dossier-bp13"
    >
      <h4 id={idTitre}className="text-xs font-medium text-foreground">
        Déclarations du dossier — pas l’état au prélèvement
      </h4>
      <p className="text-xs text-muted-foreground">
        Elles datent de leur déclaration et ne remplissent aucun champ du contexte.
      </p>
      <dl className="mt-1 space-y-1 text-xs">
        {CRITERES_A_COTE.map(critere => {
          const tete = donnees.criteres.find(c => c.critere === critere)?.tete ?? null;
          const enVigueur = tete !== null && tete.acte === 'pose';
          return (
            <div key={critere} className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">{LIBELLES_CRITERE[critere]} :</dt>
              <dd className="text-foreground">
                {enVigueur
                  ? `${LIBELLES_REPONSE[tete.reponse ?? ''] ?? tete.reponse ?? NON_RENSEIGNE} — ${LIBELLES_SOURCE_PRATICIEN[tete.source] ?? NON_RENSEIGNE} le ${jour(tete.acteLe)}`
                  : NON_RENSEIGNE}
              </dd>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-x-1">
          <dt className="text-muted-foreground">Traitements en cours :</dt>
          <dd className="text-foreground">
            {traitements.length === 0 ? (
              'aucun noté'
            ) : (
              <ul>
                {traitements.map(t => (
                  <li key={t.id}>
                    {(t.nature === 'medicament' || t.nature === 'complement' ? LIBELLES_NATURE[t.nature] : 'Traitement')}
                    {' : '}
                    {t.nom ?? ''}
                    {t.dose ? ` (${t.dose})` : ''} — {LIBELLES_SOURCE_PRATICIEN[t.source] ?? NON_RENSEIGNE} le {jour(t.acteLe)}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
