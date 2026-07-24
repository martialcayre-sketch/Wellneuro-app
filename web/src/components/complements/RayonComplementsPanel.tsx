'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FicheComplementPanel } from '@/components/complements/FicheComplementPanel';
import type { ComplementsApiResponse } from '@/app/api/praticien/complements/route';
import type { CatalogueResult, FicheComplement } from '@/lib/supplement-library/catalogue';

// Rayon compléments (C4) — instrument « à tiroir » consultable, calqué sur le
// patron de la Boussole alimentaire (C5). Entrée par intention clinique,
// facettes INDÉPENDANTES (aucune ne pondère les autres), tri MONO-DIMENSION
// (ordre neutre par défaut) et fiche justificative ouverte en tiroir. Jamais
// de score global : la présentation reste multi-dimensions.

type FacetteCle =
  | 'qualite'
  | 'biodisponibilite'
  | 'grade'
  | 'compatibilite'
  | 'interactions'
  | 'cumul'
  | 'donneesManquantes'
  | 'statut';

const LABEL_FACETTE: Record<FacetteCle, string> = {
  qualite: 'Qualité de formulation',
  biodisponibilite: 'Biodisponibilité',
  grade: 'Grade de preuve',
  compatibilite: 'Compatibilité protocole',
  interactions: 'Interactions',
  cumul: 'Cumul vs seuils',
  donneesManquantes: 'Données manquantes',
  statut: 'Statut de fiche',
};

const LABEL_VALEUR: Record<string, string> = {
  bien_documentee: 'Bien documentée',
  partielle: 'Partielle',
  lacunaire: 'Lacunaire',
  forme_preferee: 'Forme préférée',
  acceptable: 'Acceptable',
  non_preferee: 'Non préférée',
  non_evaluee: 'Non évaluée',
  fort: 'Fort',
  modere: 'Modéré',
  faible: 'Faible',
  usage_traditionnel: 'Usage traditionnel',
  compatible: 'Compatible',
  compatible_avec_vigilance: 'Compatible avec vigilance',
  vigilance_requise: 'Vigilance requise',
  signalees: 'Signalées',
  aucune_connue: 'Aucune connue',
  signale: 'Signalé',
  aucun: 'Aucun',
  liste_explicite: 'Liste explicite',
  aucune: 'Aucune',
  importee: 'Importée',
  verifiee: 'Vérifiée',
};

const LABEL_TRI: Record<string, string> = {
  neutre: 'Ordre neutre (alphabétique)',
  marque: 'Par marque',
  statut: 'Par statut de fiche',
  fraicheur: 'Par fraîcheur',
  reglesCorrespondantes: 'Par nombre de règles correspondantes',
};

const FACETTES_ORDRE: FacetteCle[] = [
  'qualite',
  'biodisponibilite',
  'grade',
  'compatibilite',
  'interactions',
  'cumul',
  'donneesManquantes',
  'statut',
];

function libelleValeur(valeur: string): string {
  return LABEL_VALEUR[valeur] ?? valeur;
}

export function RayonComplementsPanel() {
  const [intentionSaisie, setIntentionSaisie] = useState('');
  const [intention, setIntention] = useState('');
  const [tri, setTri] = useState('neutre');
  const [selections, setSelections] = useState<Record<FacetteCle, string[]>>({
    qualite: [],
    biodisponibilite: [],
    grade: [],
    compatibilite: [],
    interactions: [],
    cumul: [],
    donneesManquantes: [],
    statut: [],
  });

  const [catalogue, setCatalogue] = useState<CatalogueResult | null>(null);
  const [enCours, setEnCours] = useState(true);
  const [echec, setEchec] = useState(false);
  const [ficheOuverte, setFicheOuverte] = useState<FicheComplement | null>(null);

  const requete = useMemo(() => {
    const params = new URLSearchParams();
    if (intention) params.set('intention', intention);
    if (tri && tri !== 'neutre') params.set('tri', tri);
    for (const cle of FACETTES_ORDRE) {
      const valeurs = selections[cle];
      if (valeurs.length > 0) params.set(cle, valeurs.join(','));
    }
    const q = params.toString();
    return `/api/praticien/complements${q ? `?${q}` : ''}`;
  }, [intention, tri, selections]);

  const charger = useCallback(async () => {
    setEnCours(true);
    setEchec(false);
    try {
      const res = await fetch(requete, { cache: 'no-store' });
      const json = (await res.json()) as ComplementsApiResponse;
      if (!res.ok || !json.ok) {
        setEchec(true);
        setCatalogue(null);
        return;
      }
      setCatalogue(json);
    } catch {
      setEchec(true);
      setCatalogue(null);
    } finally {
      setEnCours(false);
    }
  }, [requete]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function basculerFacette(cle: FacetteCle, valeur: string) {
    setSelections((prev) => {
      const actuelles = prev[cle];
      const suivantes = actuelles.includes(valeur)
        ? actuelles.filter((v) => v !== valeur)
        : [...actuelles, valeur];
      return { ...prev, [cle]: suivantes };
    });
  }

  function explorerIntention() {
    setIntention(intentionSaisie.trim());
  }

  const facettes = catalogue?.facettes ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <p className="text-2xs text-muted-foreground">
          Choix multicritères sans score global : chaque dimension filtre indépendamment, le tri
          reste mono-dimension. L&apos;alimentation d&apos;abord — la supplémentation ensuite.
        </p>

        {/* Entrée par intention clinique */}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
            Intention clinique
            <input
              value={intentionSaisie}
              onChange={(e) => setIntentionSaisie(e.target.value)}
              placeholder="Ex. sommeil_fragmente"
              aria-label="Code d’intention clinique"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button type="button" variant="outline" onClick={explorerIntention}>
            Explorer cette intention
          </Button>
          {intention && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIntention('');
                setIntentionSaisie('');
              }}
            >
              Effacer l’intention
            </Button>
          )}
        </div>

        {catalogue?.intentionFiltre && (
          <p className="mt-2 text-xs text-foreground">
            Entrée par l’intention : <span className="font-medium">{catalogue.intentionFiltre.labelFr}</span>
          </p>
        )}
        {intention && catalogue && !catalogue.intentionFiltre && (
          <p className="mt-2 text-xs text-status-warning">
            Aucune intention active ne correspond à « {intention} ».
          </p>
        )}

        {/* Tri mono-dimension */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-foreground">
            Tri
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value)}
              aria-label="Clé de tri (mono-dimension)"
              className="ml-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(LABEL_TRI).map(([cle, libelle]) => (
                <option key={cle} value={cle}>
                  {libelle}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Facettes indépendantes */}
        {facettes && (
          <div className="mt-4 flex flex-col gap-3">
            {FACETTES_ORDRE.map((cle) => (
              <fieldset key={cle} className="flex flex-wrap items-center gap-1.5">
                <legend className="mr-2 text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                  {LABEL_FACETTE[cle]}
                </legend>
                {(facettes[cle] as string[]).map((valeur) => {
                  const actif = selections[cle].includes(valeur);
                  return (
                    <button
                      key={valeur}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => basculerFacette(cle, valeur)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-2xs font-semibold transition-colors ${
                        actif
                          ? 'border-indigo-600 bg-indigo-600/10 text-primary'
                          : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {libelleValeur(valeur)}
                    </button>
                  );
                })}
              </fieldset>
            ))}
          </div>
        )}
      </div>

      {/* Résultats */}
      <div className="rounded-xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Fiches</h3>
          <span className="font-mono text-2xs text-muted-foreground">
            {catalogue ? `${catalogue.total} fiche${catalogue.total > 1 ? 's' : ''}` : '—'}
          </span>
        </div>

        <div className="p-4">
          {enCours ? (
            <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
          ) : echec ? (
            <div role="alert" className="flex flex-col gap-2 text-sm text-status-danger">
              <p>Impossible de charger le catalogue.</p>
              <Button type="button" variant="outline" onClick={() => void charger()}>
                Réessayer
              </Button>
            </div>
          ) : !catalogue || catalogue.fiches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {catalogue && catalogue.total === 0 && intention
                ? 'Aucune fiche ne correspond à ces critères pour cette intention.'
                : 'Catalogue en cours de constitution — les fiches DGCCRF / Compl’Alim s’afficheront ici dès leur import.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {catalogue.fiches.map((fiche) => (
                <li key={fiche.produitId}>
                  <button
                    type="button"
                    onClick={() => setFicheOuverte(fiche)}
                    className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-foreground">
                        {fiche.nomCommercial}
                      </span>
                      <Badge variant={fiche.statutFiche === 'verifiee' ? 'success' : 'warning'}>
                        {fiche.statutLabel}
                      </Badge>
                    </div>
                    <span className="mt-1 block text-2xs text-muted-foreground">
                      {fiche.marque} · {fiche.reglesCorrespondantes} règle
                      {fiche.reglesCorrespondantes > 1 ? 's' : ''} clinique
                      {fiche.reglesCorrespondantes > 1 ? 's' : ''} correspondante
                      {fiche.reglesCorrespondantes > 1 ? 's' : ''}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="neutral">
                        {libelleValeur(fiche.dimensions.qualiteFormulation.valeur)}
                      </Badge>
                      {fiche.dimensions.biodisponibiliteForme.valeursPresentes.map((v) => (
                        <Badge key={v} variant="neutral">
                          {libelleValeur(v)}
                        </Badge>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tiroir de la fiche justificative */}
      <Dialog.Root open={ficheOuverte !== null} onOpenChange={(o) => !o && setFicheOuverte(null)}>
        <Dialog.Portal>
          <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
          <Dialog.Content
            data-theme="praticien"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-5 shadow-pop focus:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="font-display text-lg font-semibold text-foreground">
                Fiche justificative
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fermer la fiche"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <X aria-hidden="true" size={20} strokeWidth={2} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Fiche multi-dimensions du complément, justification toujours visible.
            </Dialog.Description>
            <div className="mt-4">
              {ficheOuverte && (
                <FicheComplementPanel
                  fiche={ficheOuverte}
                  intentionLabel={catalogue?.intentionFiltre?.labelFr ?? null}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
