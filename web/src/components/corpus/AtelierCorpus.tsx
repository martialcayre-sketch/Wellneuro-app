'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { AtelierCorpusPanel } from '@/components/corpus/AtelierCorpusPanel';
import { AtelierVoieRapideModale } from '@/components/corpus/AtelierVoieRapideModale';
import { EtiquetageLotPanel } from '@/components/corpus/EtiquetageLotPanel';
import { ExclusionRechercheLotPanel } from '@/components/corpus/ExclusionRechercheLotPanel';
import type { CorpusSourcesApiResponse, SourceAtelier } from '@/app/api/praticien/corpus/claims/sources/route';

// Atelier corpus — vue d'ensemble et orchestration (v2).
//
// L'entrée de la revue est la table des SOURCES, groupée par notebook (le
// registre sanitaire fait foi) : pour chaque source, ce qui part en voie
// rapide et ce qui reste en revue individuelle (prescriptifs, interprétés, et
// depuis le 2026-07-27 les claims porteurs d'une borne de décision — plage de
// référence, seuil, bande d'interprétation).
// La voie rapide s'ouvre en dialogue (tiroir large) sur UNE source — la page
// principale ne défile plus sous elle. Le filtre notebook s'applique aussi à
// la file individuelle en dessous.
//
// Refonte Lien, PRA-4 (complément DOC-13 de [[D-481]]) : titres en h2 sous le
// h1 de la page (Q1) ; filtre à 44 px (Q5) ; jetons du socle (Q10) ; table en
// blocs empilés au téléphone, patron des assignations (Q8) ; la voie rapide
// est un dialogue `PanneauSuperpose` (Q11), et le focus revient à son
// déclencheur une fois la table relue.

// Q5 : 44 px et focus visible, comme `ui/Input` ; `ui/Select` sert d'autres
// écrans et n'est pas changé par ce lot (choix des PR 1 et 3).
const CLASSE_SELECT =
  'min-h-11 h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

// Clé d'un bloc empilé au téléphone (Q8) : l'en-tête de colonne, masqué au
// bureau où le tableau le porte.
const CLASSE_CLE = 'mr-2 text-2xs uppercase tracking-[.07em] text-muted-foreground md:hidden';

export function AtelierCorpus() {
  const [notebooks, setNotebooks] = useState<Array<{ notebook: string; sources: SourceAtelier[] }>>([]);
  const [notebookChoisi, setNotebookChoisi] = useState<string>('');
  const [etat, setEtat] = useState<'chargement' | 'chargee' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState('');
  const [modale, setModale] = useState<{ sourceId: string; titre: string } | null>(null);
  /** Incrémenté à chaque issue de lot : force le rechargement de la file. */
  const [generation, setGeneration] = useState(0);
  /**
   * Source dont la voie rapide vient de se fermer : la table est relue à la
   * fermeture, ce qui démonte le déclencheur ; le focus lui revient une fois
   * la table rendue, ou au titre de la section s'il n'est plus actif.
   */
  const retourFocusRef = useRef<string | null>(null);
  const boutonsVoieRapideRef = useRef(new Map<string, HTMLButtonElement>());
  const titreSourcesRef = useRef<HTMLHeadingElement>(null);

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const reponse = await fetch('/api/praticien/corpus/claims/sources');
      const payload = (await reponse.json()) as CorpusSourcesApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.ok ? 'Vue des sources illisible.' : payload.error);
        setEtat('erreur');
        return;
      }
      setNotebooks(payload.notebooks);
      setEtat('chargee');
    } catch {
      setErreur('Erreur technique au chargement des sources.');
      setEtat('erreur');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (etat === 'chargement' || retourFocusRef.current === null) return;
    const bouton = boutonsVoieRapideRef.current.get(retourFocusRef.current);
    retourFocusRef.current = null;
    if (bouton && !bouton.disabled) bouton.focus();
    else titreSourcesRef.current?.focus();
  }, [etat]);

  const visibles = notebookChoisi
    ? notebooks.filter((n) => n.notebook === notebookChoisi)
    : notebooks;

  // Une source sans claim en attente ni tirage ouvert est entièrement traitée :
  // la vue « Tous » ne montre que le reste, pour que la revue soit en tête de
  // page ; les sources traitées se consultent en choisissant leur notebook.
  const aRevoir = (s: SourceAtelier) => s.enAttente > 0 || s.tirageOuvert;
  const aRevoirParNotebook = notebooks
    .map((n) => ({ notebook: n.notebook, sources: n.sources.filter(aRevoir) }))
    .filter((n) => n.sources.length > 0);
  const nbTraitees = notebooks.reduce(
    (total, n) => total + n.sources.filter((s) => !aRevoir(s)).length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            ref={titreSourcesRef}
            tabIndex={-1}
            className="rounded-sm font-display text-xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Sources en revue
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="filtre-notebook" className="text-sm text-muted-foreground">
              Notebook
            </label>
            <Select
              id="filtre-notebook"
              value={notebookChoisi}
              onChange={(e) => setNotebookChoisi(e.target.value)}
              className={CLASSE_SELECT}
            >
              <option value="">Tous</option>
              {notebooks.map((n) => (
                <option key={n.notebook} value={n.notebook}>
                  {n.notebook}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {etat === 'erreur' ? (
          <p role="alert" className="mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
            {erreur}
          </p>
        ) : null}
        {etat === 'chargement' ? (
          <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
        ) : null}

        {etat === 'chargee' && notebookChoisi
          ? visibles.map(({ notebook, sources }) => (
              // Consultation d'un notebook choisi : toutes ses sources, traitées comprises.
              <div key={notebook} className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
                  {notebook}
                </p>
                {tableSources(sources)}
              </div>
            ))
          : null}
        {etat === 'chargee' && !notebookChoisi
          ? aRevoirParNotebook.map(({ notebook, sources }) => (
              // Vue « Tous » : seulement ce qui reste à revoir, en tête de page.
              <div key={notebook} className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
                  {notebook}
                </p>
                {tableSources(sources)}
              </div>
            ))
          : null}
        {etat === 'chargee' &&
        !notebookChoisi &&
        notebooks.length > 0 &&
        aRevoirParNotebook.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune source à revoir.</p>
        ) : null}
        {etat === 'chargee' && !notebookChoisi && nbTraitees > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {nbTraitees === 1
              ? '1 source entièrement traitée'
              : `${nbTraitees} sources entièrement traitées`}{' '}
            — choisir un notebook pour les consulter.
          </p>
        ) : null}
        {etat === 'chargee' && (notebookChoisi ? visibles : notebooks).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune source en revue.</p>
        ) : null}
      </section>

      <EtiquetageLotPanel onConclu={() => setGeneration((g) => g + 1)} />

      <ExclusionRechercheLotPanel onConclu={() => setGeneration((g) => g + 1)} />

      <AtelierCorpusPanel key={generation} notebook={notebookChoisi || undefined} />

      {modale ? (
        <AtelierVoieRapideModale
          sourceId={modale.sourceId}
          titre={modale.titre}
          onClose={() => {
            retourFocusRef.current = modale.sourceId;
            setModale(null);
            void charger();
          }}
          onConclu={() => {
            setGeneration((g) => g + 1);
            void charger();
          }}
        />
      ) : null}
    </div>
  );

  function tableSources(sources: SourceAtelier[]) {
    return (
      <div className="mt-2">
        <table role="table" className="block w-full text-sm md:table">
          <thead role="rowgroup" className="hidden md:table-header-group">
            <tr role="row" className="text-left text-xs text-muted-foreground">
              <th role="columnheader" className="py-1.5 pr-3 font-medium">Source</th>
              <th role="columnheader" className="py-1.5 pr-3 font-medium">En attente</th>
              <th role="columnheader" className="py-1.5 pr-3 font-medium">Voie rapide</th>
              <th role="columnheader" className="py-1.5 pr-3 font-medium">Individuelle</th>
              <th role="columnheader" className="py-1.5 pr-3 font-medium">Validés</th>
              <th role="columnheader" className="py-1.5 pr-0 font-medium" aria-label="Actions" />
            </tr>
          </thead>
          <tbody role="rowgroup" className="block md:table-row-group">
            {sources.map((source) => (
              <tr
                key={source.sourceId}
                role="row"
                className="flex flex-col gap-1 border-t border-border py-3 md:table-row md:py-0"
              >
                <td role="cell" className="md:table-cell md:max-w-64 md:py-2 md:pr-3">
                  <p className="font-medium text-foreground [overflow-wrap:anywhere] md:truncate" title={source.titre}>
                    {source.titre}
                  </p>
                  <p className="text-xs text-muted-foreground">{source.sourceId}</p>
                </td>
                <td role="cell" className="md:table-cell md:py-2 md:pr-3">
                  <span className={CLASSE_CLE}>En attente</span>
                  {source.enAttente}
                </td>
                <td role="cell" className="md:table-cell md:py-2 md:pr-3">
                  <span className={CLASSE_CLE}>Voie rapide</span>
                  {source.voieRapide}
                </td>
                <td role="cell" className="md:table-cell md:py-2 md:pr-3">
                  <span className={CLASSE_CLE}>Individuelle</span>
                  {source.voieLente}
                </td>
                <td role="cell" className="md:table-cell md:py-2 md:pr-3">
                  <span className={CLASSE_CLE}>Validés</span>
                  {source.valides}
                </td>
                <td role="cell" className="flex flex-wrap items-center gap-2 pt-1 md:table-cell md:py-2 md:pr-0 md:text-right">
                  {source.tirageOuvert ? <Badge variant="warning">Revue en cours</Badge> : null}{' '}
                  <Button
                    ref={(element) => {
                      if (element) boutonsVoieRapideRef.current.set(source.sourceId, element);
                      else boutonsVoieRapideRef.current.delete(source.sourceId);
                    }}
                    variant="outline"
                    onClick={() =>
                      setModale({ sourceId: source.sourceId, titre: source.titre })
                    }
                    disabled={source.voieRapide === 0 && !source.tirageOuvert}
                    title={
                      source.voieRapide > 0 || source.tirageOuvert
                        ? undefined
                        : 'Aucun claim signable par lot — tout est en revue individuelle.'
                    }
                  >
                    Voie rapide
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
