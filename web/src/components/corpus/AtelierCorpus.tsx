'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AtelierCorpusPanel } from '@/components/corpus/AtelierCorpusPanel';
import { AtelierVoieRapideModale } from '@/components/corpus/AtelierVoieRapideModale';
import type { CorpusSourcesApiResponse, SourceAtelier } from '@/app/api/praticien/corpus/claims/sources/route';

// Atelier corpus — vue d'ensemble et orchestration (v2).
//
// L'entrée de la revue est la table des SOURCES, groupée par notebook (le
// registre sanitaire fait foi) : pour chaque source, ce qui part en voie
// rapide et ce qui reste en revue individuelle (prescriptifs + interprétés —
// la validation manuelle des prescriptifs est conservée par construction).
// La voie rapide s'ouvre en MODALE plein écran sur UNE source — la page
// principale ne défile plus sous elle. Le filtre notebook s'applique aussi à
// la file individuelle en dessous.

export function AtelierCorpus() {
  const [notebooks, setNotebooks] = useState<Array<{ notebook: string; sources: SourceAtelier[] }>>([]);
  const [notebookChoisi, setNotebookChoisi] = useState<string>('');
  const [etat, setEtat] = useState<'chargement' | 'chargee' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState('');
  const [modale, setModale] = useState<{ sourceId: string; titre: string } | null>(null);
  /** Incrémenté à chaque issue de lot : force le rechargement de la file. */
  const [generation, setGeneration] = useState(0);

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

  const visibles = notebookChoisi
    ? notebooks.filter((n) => n.notebook === notebookChoisi)
    : notebooks;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold text-foreground">Sources en revue</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="filtre-notebook" className="text-sm text-muted-foreground">
              Notebook
            </label>
            <select
              id="filtre-notebook"
              value={notebookChoisi}
              onChange={(e) => setNotebookChoisi(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Tous</option>
              {notebooks.map((n) => (
                <option key={n.notebook} value={n.notebook}>
                  {n.notebook}
                </option>
              ))}
            </select>
          </div>
        </div>

        {etat === 'erreur' ? (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erreur}
          </p>
        ) : null}
        {etat === 'chargement' ? (
          <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
        ) : null}

        {etat === 'chargee'
          ? visibles.map(({ notebook, sources }) => (
              <div key={notebook} className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
                  {notebook}
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Source</th>
                        <th className="py-1.5 pr-3 font-medium">En attente</th>
                        <th className="py-1.5 pr-3 font-medium">Voie rapide</th>
                        <th className="py-1.5 pr-3 font-medium">Individuelle</th>
                        <th className="py-1.5 pr-3 font-medium">Validés</th>
                        <th className="py-1.5 pr-0 font-medium" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((source) => (
                        <tr key={source.sourceId} className="border-t border-border">
                          <td className="max-w-64 py-2 pr-3">
                            <p className="truncate font-medium text-foreground" title={source.titre}>
                              {source.titre}
                            </p>
                            <p className="text-xs text-muted-foreground">{source.sourceId}</p>
                          </td>
                          <td className="py-2 pr-3">{source.enAttente}</td>
                          <td className="py-2 pr-3">{source.voieRapide}</td>
                          <td className="py-2 pr-3">{source.voieLente}</td>
                          <td className="py-2 pr-3">{source.valides}</td>
                          <td className="py-2 pr-0 text-right">
                            {source.tirageOuvert ? <Badge variant="warning">Revue en cours</Badge> : null}{' '}
                            <Button
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
              </div>
            ))
          : null}
        {etat === 'chargee' && visibles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune source en revue.</p>
        ) : null}
      </section>

      <AtelierCorpusPanel key={generation} notebook={notebookChoisi || undefined} />

      {modale ? (
        <AtelierVoieRapideModale
          sourceId={modale.sourceId}
          titre={modale.titre}
          onClose={() => {
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
}
