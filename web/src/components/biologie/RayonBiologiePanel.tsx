'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  FicheAnalytePanel,
  LABEL_NIVEAU,
  LABEL_REMBOURSEMENT,
  LABEL_STATUT_FICHE,
  libelleTechnique,
} from '@/components/biologie/FicheAnalytePanel';
import type { CatalogueBiologieApiResponse } from '@/app/api/praticien/biologie/catalogue/route';
import type {
  CatalogueBiologieResult,
  FicheAnalyte,
} from '@/lib/biology-library/catalogue';

// Rayon biologie fonctionnelle (CB-08) — instrument de consultation calqué sur
// le patron C4 (RayonComplementsPanel) : bilans hiérarchisés puis fiches
// d'analytes, fiche justificative ouverte en tiroir. Jamais de score global.
//
// Contrairement au rayon C4 (140 148 fiches, mur d'entrée), le catalogue
// niveau 1 compte 47 analytes et 15 bilans : tout se charge en UNE requête au
// montage, la recherche et les filtres restent à l'écran. Le jeton de séquence
// est conservé malgré la requête unique — un démontage/remontage (strict mode,
// navigation) ne doit pas laisser une réponse en vol écrire sur le suivant.
//
// Étage documentaire seul : AUCUNE valeur biologique patient n'existe derrière
// cette surface, et le bandeau le dit.

const ORDRE_NIVEAUX = ['socle', 'approfondissement', 'specialise'] as const;

function libelleNiveau(niveau: string): string {
  return LABEL_NIVEAU[niveau] ?? niveau;
}

export function RayonBiologiePanel() {
  const [catalogue, setCatalogue] = useState<CatalogueBiologieResult | null>(null);
  const [enCours, setEnCours] = useState(true);
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [surfaceIndisponible, setSurfaceIndisponible] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [prelevement, setPrelevement] = useState('');
  const [ficheOuverte, setFicheOuverte] = useState<FicheAnalyte | null>(null);

  // Seule la DERNIÈRE requête émise écrit à l'écran (patron C4).
  const sequence = useRef(0);

  useEffect(() => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setMessageEchec(null);
    setSurfaceIndisponible(null);
    void (async () => {
      try {
        const res = await fetch('/api/praticien/biologie/catalogue', { cache: 'no-store' });
        const json = (await res.json()) as CatalogueBiologieApiResponse;
        if (perimee()) return;
        if (!res.ok || !json.ok) {
          if (json.ok === false && json.reason === 'flag_eteint') {
            setSurfaceIndisponible(json.error);
          } else {
            setMessageEchec(
              !json.ok && json.error ? json.error : 'Impossible de charger le catalogue.',
            );
          }
          setCatalogue(null);
          return;
        }
        setCatalogue(json);
      } catch {
        if (perimee()) return;
        setMessageEchec('Impossible de charger le catalogue.');
        setCatalogue(null);
      } finally {
        if (!perimee()) setEnCours(false);
      }
    })();
    return () => {
      // Invalide la réponse en vol au démontage : elle n'écrira pas sur le
      // montage suivant.
      sequence.current += 1;
    };
  }, []);

  const prelevements = useMemo(() => {
    if (!catalogue) return [] as string[];
    return [...new Set(catalogue.analytes.map(a => a.typePrelevement))].sort();
  }, [catalogue]);

  const analytesFiltres = useMemo(() => {
    if (!catalogue) return [] as FicheAnalyte[];
    const terme = recherche.trim().toLocaleLowerCase('fr-FR');
    return catalogue.analytes.filter(analyte => {
      if (prelevement && analyte.typePrelevement !== prelevement) return false;
      if (!terme) return true;
      return (
        analyte.libelle.toLocaleLowerCase('fr-FR').includes(terme) ||
        analyte.code.toLocaleLowerCase('fr-FR').includes(terme) ||
        (analyte.libellePatient ?? '').toLocaleLowerCase('fr-FR').includes(terme)
      );
    });
  }, [catalogue, recherche, prelevement]);

  const panelsParNiveau = useMemo(() => {
    if (!catalogue) return [];
    const niveauxPresents = [
      ...ORDRE_NIVEAUX.filter(niveau => catalogue.panels.some(p => p.niveau === niveau)),
      ...[...new Set(catalogue.panels.map(p => p.niveau))].filter(
        niveau => !(ORDRE_NIVEAUX as readonly string[]).includes(niveau),
      ),
    ];
    return niveauxPresents.map(niveau => ({
      niveau,
      panels: catalogue.panels.filter(p => p.niveau === niveau),
    }));
  }, [catalogue]);

  const analytesParCode = useMemo(() => {
    if (!catalogue) return new Map<string, FicheAnalyte>();
    return new Map(catalogue.analytes.map(a => [a.code, a]));
  }, [catalogue]);

  if (surfaceIndisponible) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
      >
        {surfaceIndisponible}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Catalogue documentaire : bilans hiérarchisés et fiches d’analytes, avec leurs deux
          référentiels de valeurs. Une orientation d’exploration se prépare au dossier, depuis le
          cockpit — ce rayon consulte, il ne propose rien.
        </p>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          Aucune valeur d’analyse patient — étage documentaire
        </span>
      </div>

      {messageEchec && (
        <p role="alert" className="rounded-lg border border-status-danger/40 bg-status-danger/10 p-3 text-sm text-status-danger">
          {messageEchec}
        </p>
      )}

      {enCours && (
        <p role="status" className="text-sm text-muted-foreground">
          Chargement du catalogue…
        </p>
      )}

      {catalogue && (
        <>
          <section aria-labelledby="bilans-biologie-titre" className="flex flex-col gap-3">
            <h4 id="bilans-biologie-titre" className="text-sm font-semibold text-foreground">
              Bilans ({catalogue.panels.length})
            </h4>
            {panelsParNiveau.map(groupe => (
              <div key={groupe.niveau}>
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">
                  {libelleNiveau(groupe.niveau)}
                </p>
                <ul className="mt-2 grid gap-3 lg:grid-cols-2">
                  {groupe.panels.map(panel => (
                    <li
                      key={panel.code}
                      className="rounded-xl border border-border bg-surface p-4 shadow-card"
                    >
                      <p className="font-medium text-foreground">{panel.libelle}</p>
                      {panel.objectif && (
                        <p className="mt-1 text-sm text-muted-foreground">{panel.objectif}</p>
                      )}
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {panel.items.map(item => {
                          const fiche =
                            item.type === 'analyte' ? analytesParCode.get(item.code) : undefined;
                          return (
                            <li key={`${item.type}-${item.code}`}>
                              {fiche ? (
                                <button
                                  type="button"
                                  onClick={() => setFicheOuverte(fiche)}
                                  className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                                >
                                  {item.libelle}
                                </button>
                              ) : (
                                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                  {item.libelle}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section aria-labelledby="analytes-biologie-titre" className="flex flex-col gap-3">
            <h4 id="analytes-biologie-titre" className="text-sm font-semibold text-foreground">
              Analytes ({analytesFiltres.length} sur {catalogue.analytes.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={recherche}
                onChange={event => setRecherche(event.target.value)}
                placeholder="Rechercher un analyte (nom ou code)"
                aria-label="Rechercher un analyte"
                className="h-11 w-full max-w-sm rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <select
                value={prelevement}
                onChange={event => setPrelevement(event.target.value)}
                aria-label="Filtrer par type de prélèvement"
                className="h-11 rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <option value="">Tous les prélèvements</option>
                {prelevements.map(type => (
                  <option key={type} value={type}>
                    {libelleTechnique(type)}
                  </option>
                ))}
              </select>
            </div>
            {analytesFiltres.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun analyte ne correspond à ces critères.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {analytesFiltres.map(analyte => (
                  <li key={analyte.code}>
                    <button
                      type="button"
                      onClick={() => setFicheOuverte(analyte)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 text-left shadow-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium text-foreground">{analyte.libelle}</span>
                        <span className="text-xs text-muted-foreground">
                          {libelleTechnique(analyte.typePrelevement)}
                          {analyte.unite ? ` · ${analyte.unite}` : ''}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {analyte.validationMedicaleRequise && (
                          <Badge variant="warning">Validation médicale</Badge>
                        )}
                        <Badge variant="neutral">
                          {LABEL_STATUT_FICHE[analyte.statutFiche] ?? analyte.statutFiche}
                        </Badge>
                        <Badge variant="neutral">
                          {LABEL_REMBOURSEMENT[analyte.remboursement.statut] ??
                            analyte.remboursement.statut}
                        </Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {catalogue.millesimeNabm && (
            <p className="text-xs text-muted-foreground">
              Nomenclature de biologie médicale : millésime {catalogue.millesimeNabm.versionSource}{' '}
              ({catalogue.millesimeNabm.nombreEntrees} actes) — aucun tarif affiché, la valeur de
              la lettre-clé relève d’un arrêté.
            </p>
          )}
        </>
      )}

      {/* Tiroir de la fiche analyte (patron C4) */}
      <Dialog.Root open={ficheOuverte !== null} onOpenChange={o => !o && setFicheOuverte(null)}>
        <Dialog.Portal>
          <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
          <Dialog.Content
            data-theme="praticien"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-5 shadow-pop focus:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="font-display text-lg font-semibold text-foreground">
                Fiche analyte
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
              Fiche documentaire de l’analyte : identité, référentiels de valeurs, remboursement,
              provenance.
            </Dialog.Description>
            <div className="mt-4">{ficheOuverte && <FicheAnalytePanel fiche={ficheOuverte} />}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
