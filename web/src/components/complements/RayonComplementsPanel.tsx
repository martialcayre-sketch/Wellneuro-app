'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
//
// Le catalogue compte 140 148 fiches : l'écran ne charge RIEN tant qu'aucun
// critère n'est posé, et la base ne sert ensuite qu'une page. Le mur d'entrée
// est délibéré, pas un oubli.

type FacetteCle = 'qualite' | 'interactions' | 'donneesManquantes' | 'statut';

// Facettes dont la donnée n'existe pas encore (composition des produits) :
// affichées, désactivées et expliquées — jamais un filtre qui ne filtre rien.
type FacetteGrisee = 'grade' | 'biodisponibilite' | 'compatibilite' | 'cumul';

const LABEL_FACETTE: Record<FacetteCle | FacetteGrisee, string> = {
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
};

const FACETTES_ORDRE: FacetteCle[] = ['qualite', 'interactions', 'donneesManquantes', 'statut'];
const FACETTES_GRISEES: FacetteGrisee[] = ['grade', 'biodisponibilite', 'compatibilite', 'cumul'];

// Vocabulaire des facettes servies. Recopié du service À DESSEIN : importer
// `catalogue.ts` depuis un composant client embarquerait Prisma dans le paquet
// navigateur. Les valeurs doivent être connues AVANT toute réponse, sinon
// aucune facette n'est cliquable tant qu'aucun critère n'est posé — et comme
// une facette EST un critère, l'écran resterait sans issue. Un test de garde
// interdit la dérive avec FACETTES.
export const VALEURS_FACETTE: Record<FacetteCle, readonly string[]> = {
  qualite: ['bien_documentee', 'partielle', 'lacunaire'],
  interactions: ['signalees', 'aucune_connue', 'non_evaluee'],
  donneesManquantes: ['liste_explicite', 'aucune', 'non_evaluee'],
  statut: ['importee', 'verifiee'],
};

// Valeurs d'une facette PAR AILLEURS servie qui ne sont pas fiables tant que la
// complétude de composition n'est pas prouvée. « Aucune interaction connue »
// se lit sur les ingrédients résolus : sur une fiche partiellement résolue,
// l'ingrédient porteur du signal peut être justement celui qui manque. Montrée
// et désactivée, jamais retirée en silence — le praticien doit savoir que le
// critère existe et pourquoi il ne répond pas encore. Recopié du service
// (VALEURS_FACETTE_INDISPONIBLES), avec garde de test contre la dérive.
export const VALEURS_FACETTE_GRISEES: Partial<Record<FacetteCle, readonly string[]>> = {
  interactions: ['aucune_connue'],
};

// Recopié de OFFSET_MAX du service, pour la même raison que le vocabulaire
// ci-dessus. Une garde de test interdit la dérive.
export const OFFSET_MAX_ECRAN = 10_000;

const MESSAGE_CRITERE_ATTENDU =
  'Recherchez un nom, une marque, une intention clinique, ou choisissez un filtre pour afficher des fiches.';
const MESSAGE_FACETTE_GRISEE = 'Disponible après l’import de la composition des produits.';
const MESSAGE_VALEUR_GRISEE =
  'Fiable seulement une fois la composition des produits entièrement résolue.';

function libelleValeur(valeur: string): string {
  return LABEL_VALEUR[valeur] ?? valeur;
}

export function RayonComplementsPanel() {
  const [rechercheSaisie, setRechercheSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [intentionSaisie, setIntentionSaisie] = useState('');
  const [intention, setIntention] = useState('');
  const [tri, setTri] = useState('neutre');
  const [page, setPage] = useState(1);
  const [selections, setSelections] = useState<Record<FacetteCle, string[]>>({
    qualite: [],
    interactions: [],
    donneesManquantes: [],
    statut: [],
  });

  const [catalogue, setCatalogue] = useState<CatalogueResult | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState<FicheComplement | null>(null);

  // Un critère au moins doit être posé : sans lui, la requête ramènerait le
  // catalogue entier, que la fonction ne peut pas servir.
  const aucunCritere = useMemo(
    () => !recherche && !intention && FACETTES_ORDRE.every((cle) => selections[cle].length === 0),
    [recherche, intention, selections],
  );

  const requete = useMemo(() => {
    const params = new URLSearchParams();
    if (recherche) params.set('q', recherche);
    if (intention) params.set('intention', intention);
    if (tri && tri !== 'neutre') params.set('tri', tri);
    for (const cle of FACETTES_ORDRE) {
      const valeurs = selections[cle];
      if (valeurs.length > 0) params.set(cle, valeurs.join(','));
    }
    if (page > 1) params.set('page', String(page));
    const q = params.toString();
    return `/api/praticien/complements${q ? `?${q}` : ''}`;
  }, [recherche, intention, tri, selections, page]);

  // Jeton de séquence : seule la DERNIÈRE requête émise a le droit d'écrire à
  // l'écran. Sans lui, une réponse lente arrivée après une réponse rapide
  // affiche des fiches qui ne correspondent plus aux critères cochés — le tort
  // exact que la route refuse en 400, réintroduit par le client.
  const sequence = useRef(0);

  const charger = useCallback(async () => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setMessageEchec(null);
    try {
      const res = await fetch(requete, { cache: 'no-store' });
      const json = (await res.json()) as ComplementsApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setMessageEchec(!json.ok && json.error ? json.error : 'Impossible de charger le catalogue.');
        setCatalogue(null);
        return;
      }
      setCatalogue(json);
    } catch {
      if (perimee()) return;
      setMessageEchec('Impossible de charger le catalogue.');
      setCatalogue(null);
    } finally {
      // Le voyant ne s'éteint que pour la requête courante : une réponse
      // périmée ne doit pas rouvrir la pagination pendant que l'autre vole.
      if (!perimee()) setEnCours(false);
    }
  }, [requete]);

  useEffect(() => {
    if (aucunCritere) {
      // Invalide toute réponse encore en vol : sinon elle repeuplerait un
      // écran que l'utilisateur vient de vider.
      sequence.current += 1;
      setCatalogue(null);
      setMessageEchec(null);
      setEnCours(false);
      return;
    }
    void charger();
  }, [charger, aucunCritere]);

  // Tout changement de critère ramène à la première page : sans cela, une
  // recherche neuve s'ouvrirait sur la page 7 de la précédente — le plus
  // souvent vide.
  function basculerFacette(cle: FacetteCle, valeur: string) {
    setPage(1);
    setSelections((prev) => {
      const actuelles = prev[cle];
      const suivantes = actuelles.includes(valeur)
        ? actuelles.filter((v) => v !== valeur)
        : [...actuelles, valeur];
      return { ...prev, [cle]: suivantes };
    });
  }

  function lancerRecherche() {
    setPage(1);
    setRecherche(rechercheSaisie.trim());
  }

  function explorerIntention() {
    setPage(1);
    setIntention(intentionSaisie.trim());
  }

  const parPage = catalogue?.parPage ?? 25;
  const total = catalogue?.total ?? 0;
  // Le nombre de pages ANNONCÉ est celui des pages réellement atteignables :
  // le service refuse au-delà de l'offset plafond. Annoncer « page 1 sur 5606 »
  // quand la 402e est refusée serait un compte faux.
  const nombrePages = Math.min(
    total > 0 ? Math.ceil(total / parPage) : 1,
    Math.floor(OFFSET_MAX_ECRAN / parPage) + 1,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <p className="text-2xs text-muted-foreground">
          Choix multicritères sans score global : chaque dimension filtre indépendamment, le tri
          reste mono-dimension. L&apos;alimentation d&apos;abord — la supplémentation ensuite.
        </p>

        {/* Recherche par nom ou marque */}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
            Nom ou marque
            <input
              value={rechercheSaisie}
              onChange={(e) => setRechercheSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lancerRecherche();
                }
              }}
              placeholder="Ex. magnésium"
              aria-label="Rechercher un produit ou une marque"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button type="button" variant="outline" onClick={lancerRecherche}>
            Rechercher
          </Button>
          {recherche && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage(1);
                setRecherche('');
                setRechercheSaisie('');
              }}
            >
              Effacer la recherche
            </Button>
          )}
        </div>

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
              onChange={(e) => {
                // Changer l'ordre rebat les fiches : rester en page 7 y
                // montrerait un fragment sans rapport avec ce qu'on lisait.
                setPage(1);
                setTri(e.target.value);
              }}
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

        {/* Facettes indépendantes — disponibles dès l'ouverture de l'écran. */}
        <div className="mt-4 flex flex-col gap-3">
            {FACETTES_ORDRE.map((cle) => (
              <fieldset key={cle} className="flex flex-wrap items-center gap-1.5">
                <legend className="mr-2 text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                  {LABEL_FACETTE[cle]}
                </legend>
                {VALEURS_FACETTE[cle].map((valeur) => {
                  const grisee = VALEURS_FACETTE_GRISEES[cle]?.includes(valeur) ?? false;
                  const actif = !grisee && selections[cle].includes(valeur);
                  return (
                    <button
                      key={valeur}
                      type="button"
                      aria-pressed={actif}
                      disabled={grisee}
                      title={grisee ? MESSAGE_VALEUR_GRISEE : undefined}
                      onClick={() => basculerFacette(cle, valeur)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-2xs font-semibold transition-colors ${
                        grisee
                          ? 'cursor-not-allowed border-dashed border-border bg-surface text-muted-foreground'
                          : actif
                            ? 'border-indigo-600 bg-indigo-600/10 text-primary'
                            : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {libelleValeur(valeur)}
                    </button>
                  );
                })}
                {VALEURS_FACETTE_GRISEES[cle] && (
                  <span className="basis-full text-2xs text-muted-foreground">
                    {MESSAGE_VALEUR_GRISEE}
                  </span>
                )}
              </fieldset>
            ))}

            {/* Critères sans donnée : montrés, désactivés, expliqués. */}
            {FACETTES_GRISEES.map((cle) => (
              <fieldset key={cle} className="flex flex-wrap items-center gap-1.5">
                <legend className="mr-2 text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                  {LABEL_FACETTE[cle]}
                </legend>
                <span className="text-2xs text-muted-foreground">{MESSAGE_FACETTE_GRISEE}</span>
              </fieldset>
            ))}
        </div>
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
          {aucunCritere ? (
            <p className="text-sm text-muted-foreground">{MESSAGE_CRITERE_ATTENDU}</p>
          ) : enCours ? (
            <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
          ) : messageEchec ? (
            <div role="alert" className="flex flex-col gap-2 text-sm text-status-danger">
              <p>{messageEchec}</p>
              <Button type="button" variant="outline" onClick={() => void charger()}>
                Réessayer
              </Button>
            </div>
          ) : !catalogue || catalogue.fiches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune fiche ne correspond à ces critères.
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
                      {/* Le compteur se calcule sur les ingrédients RÉSOLUS : sur
                          une fiche partielle il est sous-estimé, et c'est la
                          liste — pas le tiroir — que le praticien parcourt. */}
                      {fiche.completudeComposition === 'partielle'
                        ? ' (au moins — composition partiellement résolue)'
                        : ''}
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

          {catalogue && catalogue.fiches.length > 0 && (
            <nav
              aria-label="Pagination du catalogue"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
            >
              <span className="font-mono text-2xs text-muted-foreground">
                Page {catalogue.page} sur {nombrePages} · {catalogue.total} fiche
                {catalogue.total > 1 ? 's' : ''} au total
              </span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={catalogue.page <= 1 || enCours}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Page précédente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={catalogue.page >= nombrePages || enCours}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Page suivante
                </Button>
              </span>
            </nav>
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
