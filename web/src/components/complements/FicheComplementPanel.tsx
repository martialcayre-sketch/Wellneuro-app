'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { labelGradePreuve, type GradePreuveScientifique } from '@/lib/supplement-library/types';
import type { FicheComplement } from '@/lib/supplement-library/catalogue';
import type { ComplementsCorpusApiResponse } from '@/app/api/praticien/complements/corpus/route';

// Fiche justificative sourcée (C4, outil n°2) — badge multi-dimensions +
// fiche détaillée avec provenance/fraîcheur, citations du rayon corpus (claims
// D-003) et références scientifiques (SupplementSourceReference). La
// justification de CHAQUE dimension est TOUJOURS visible (décision figée de
// C4 : sans justification, une liste ordonnée serait perçue comme une
// recommandation commerciale). Jamais de score global agrégé.

const LABEL_QUALITE: Record<string, { texte: string; variant: BadgeVariant }> = {
  bien_documentee: { texte: 'Bien documentée', variant: 'success' },
  partielle: { texte: 'Partielle', variant: 'warning' },
  lacunaire: { texte: 'Lacunaire', variant: 'danger' },
  non_evaluee: { texte: 'Non évaluée', variant: 'neutral' },
};

const LABEL_BIODISPO: Record<string, { texte: string; variant: BadgeVariant }> = {
  forme_preferee: { texte: 'Forme préférée', variant: 'success' },
  acceptable: { texte: 'Acceptable', variant: 'info' },
  non_preferee: { texte: 'Non préférée', variant: 'warning' },
  non_evaluee: { texte: 'Non évaluée', variant: 'neutral' },
};

const LABEL_COMPAT: Record<string, { texte: string; variant: BadgeVariant }> = {
  compatible: { texte: 'Compatible', variant: 'success' },
  compatible_avec_vigilance: { texte: 'Compatible avec vigilance', variant: 'warning' },
  vigilance_requise: { texte: 'Vigilance requise', variant: 'danger' },
  non_evaluee: { texte: 'Non évaluée', variant: 'neutral' },
};

const LABEL_INTERACTIONS: Record<string, { texte: string; variant: BadgeVariant }> = {
  signalees: { texte: 'Interactions signalées', variant: 'danger' },
  aucune_connue: { texte: 'Aucune interaction connue', variant: 'success' },
  non_evaluee: { texte: 'Interactions non évaluées', variant: 'neutral' },
};

const LABEL_CUMUL: Record<string, { texte: string; variant: BadgeVariant }> = {
  signale: { texte: 'Cumul signalé', variant: 'warning' },
  aucun: { texte: 'Aucun cumul', variant: 'success' },
  non_evaluee: { texte: 'Cumul non évalué', variant: 'neutral' },
};

const LABEL_DONNEES: Record<string, { texte: string; variant: BadgeVariant }> = {
  liste_explicite: { texte: 'Données manquantes', variant: 'warning' },
  aucune: { texte: 'Données complètes', variant: 'success' },
  non_evaluee: { texte: 'Complétude non évaluée', variant: 'neutral' },
};

const VARIANT_GRADE: Record<GradePreuveScientifique, BadgeVariant> = {
  fort: 'success',
  modere: 'info',
  faible: 'warning',
  usage_traditionnel: 'neutral',
};

function formaterDate(iso: string | null): string {
  if (!iso) return 'non renseignée';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'non renseignée' : date.toLocaleDateString('fr-FR');
}

function Dimension({
  titre,
  justification,
  children,
}: {
  titre: string;
  justification: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
          {titre}
        </h4>
        {children}
      </div>
      {/* Justification TOUJOURS visible — jamais repliée derrière un clic. */}
      <p className="mt-1.5 text-xs text-muted-foreground">{justification}</p>
    </section>
  );
}

export function FicheComplementPanel({
  fiche,
  rayon = 'micronutrition',
  intentionLabel = null,
}: {
  fiche: FicheComplement;
  rayon?: string;
  intentionLabel?: string | null;
}) {
  const [corpus, setCorpus] = useState<Extract<ComplementsCorpusApiResponse, { ok: true }> | null>(null);
  const [corpusEnCours, setCorpusEnCours] = useState(true);
  const [corpusEchec, setCorpusEchec] = useState(false);

  const d = fiche.dimensions;

  const requeteCorpus = useMemo(() => {
    const ingredients = fiche.composition.map((c) => c.ingredientNomFr).join(', ');
    return [fiche.nomCommercial, intentionLabel, ingredients].filter(Boolean).join(' · ');
  }, [fiche.nomCommercial, fiche.composition, intentionLabel]);

  useEffect(() => {
    let monté = true;
    setCorpusEnCours(true);
    setCorpusEchec(false);
    (async () => {
      try {
        const url = `/api/praticien/complements/corpus?rayon=${encodeURIComponent(rayon)}&requete=${encodeURIComponent(requeteCorpus)}`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json()) as ComplementsCorpusApiResponse;
        if (!monté) return;
        if (!res.ok || !json.ok) {
          setCorpusEchec(true);
          return;
        }
        setCorpus(json);
      } catch {
        if (monté) setCorpusEchec(true);
      } finally {
        if (monté) setCorpusEnCours(false);
      }
    })();
    return () => {
      monté = false;
    };
  }, [rayon, requeteCorpus]);

  const qualite = LABEL_QUALITE[d.qualiteFormulation.valeur] ?? LABEL_QUALITE.non_evaluee;
  const compat = LABEL_COMPAT[d.compatibiliteProtocole.valeur] ?? LABEL_COMPAT.non_evaluee;
  const interactions = LABEL_INTERACTIONS[d.interactionsSignalees.valeur] ?? LABEL_INTERACTIONS.non_evaluee;
  const cumul = LABEL_CUMUL[d.cumulVsSeuils.valeur] ?? LABEL_CUMUL.non_evaluee;
  const donnees = LABEL_DONNEES[d.donneesManquantes.valeur] ?? LABEL_DONNEES.non_evaluee;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-foreground">{fiche.nomCommercial}</h3>
          <Badge variant={fiche.statutFiche === 'verifiee' ? 'success' : 'warning'}>
            {fiche.statutLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{fiche.marque} · marché {fiche.marche}</p>
      </header>

      {/* Rangée de badges multi-dimensions — jamais un chiffre unique. */}
      <div className="flex flex-wrap gap-1.5" aria-label="Dimensions de qualité">
        <Badge variant={qualite.variant}>{qualite.texte}</Badge>
        <Badge variant={compat.variant}>{compat.texte}</Badge>
        <Badge variant={interactions.variant}>{interactions.texte}</Badge>
        <Badge variant={cumul.variant}>{cumul.texte}</Badge>
        <Badge variant={donnees.variant}>{donnees.texte}</Badge>
      </div>
      <p className="text-2xs text-muted-foreground">
        Présentation multi-dimensions : chaque dimension est nommée et sourcée, jamais fondue en une
        note unique.
      </p>

      {/* Composition */}
      <section className="rounded-lg border border-border p-3">
        <h4 className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
          Composition
        </h4>
        {fiche.composition.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Composition non renseignée.</p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-foreground">
            {fiche.composition.map((c) => (
              <li key={`${c.ingredientCode}-${c.formeCode ?? 'sans-forme'}`}>
                <span className="font-medium">{c.ingredientNomFr}</span>
                {c.formeLabelFr ? ` — ${c.formeLabelFr}` : ''}
                {c.doseParPortion != null ? ` · ${c.doseParPortion} ${c.unite ?? ''}`.trimEnd() : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dimension titre="Qualité de formulation" justification={d.qualiteFormulation.justification}>
        <Badge variant={qualite.variant}>{qualite.texte}</Badge>
      </Dimension>

      <Dimension titre="Biodisponibilité de la forme" justification={d.biodisponibiliteForme.justification}>
        {d.biodisponibiliteForme.valeursPresentes.map((v) => {
          const l = LABEL_BIODISPO[v] ?? LABEL_BIODISPO.non_evaluee;
          return (
            <Badge key={v} variant={l.variant}>
              {l.texte}
            </Badge>
          );
        })}
      </Dimension>

      <Dimension
        titre="Grade de preuve par intention"
        justification={d.gradePreuveParIntention.justification}
      >
        {d.gradePreuveParIntention.valeurs.length === 0 ? (
          <Badge variant="neutral">Non applicable</Badge>
        ) : (
          d.gradePreuveParIntention.valeurs.map((g) => (
            <Badge key={`${g.intentionCode}-${g.ingredientCode}`} variant={VARIANT_GRADE[g.grade]}>
              {g.intentionLabelFr} · {g.ingredientCode} · preuve scientifique — {labelGradePreuve(g.grade)}
            </Badge>
          ))
        )}
      </Dimension>

      <Dimension titre="Compatibilité protocole" justification={d.compatibiliteProtocole.justification}>
        <Badge variant={compat.variant}>{compat.texte}</Badge>
      </Dimension>

      <Dimension titre="Interactions signalées" justification={d.interactionsSignalees.justification}>
        <Badge variant={interactions.variant}>{interactions.texte}</Badge>
      </Dimension>
      {d.interactionsSignalees.signalements.length > 0 && (
        <ul className="-mt-2 flex flex-col gap-1 pl-3 text-xs text-status-danger">
          {d.interactionsSignalees.signalements.map((s) => (
            <li key={`${s.code}-${s.ingredientCode}`}>
              {s.ingredientCode} : {s.messageFr}
            </li>
          ))}
        </ul>
      )}
      <p className="-mt-2 pl-3 text-2xs italic text-muted-foreground">
        {d.interactionsSignalees.mentionMedecin}
      </p>

      <Dimension titre="Cumul vs seuils" justification={d.cumulVsSeuils.justification}>
        <Badge variant={cumul.variant}>{cumul.texte}</Badge>
      </Dimension>
      {d.cumulVsSeuils.signaux.length > 0 && (
        <ul className="-mt-2 flex flex-col gap-1 pl-3 text-xs text-status-warning">
          {d.cumulVsSeuils.signaux.map((s, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={`${s.typeFlag}-${i}`}>{s.message}</li>
          ))}
        </ul>
      )}

      <Dimension titre="Données manquantes" justification={d.donneesManquantes.justification}>
        <Badge variant={donnees.variant}>{donnees.texte}</Badge>
      </Dimension>
      {d.donneesManquantes.elements.length > 0 && (
        <ul className="-mt-2 list-disc pl-8 text-xs text-muted-foreground">
          {d.donneesManquantes.elements.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Dimension titre="Fraîcheur / provenance" justification={d.fraicheurProvenance.justification}>
        <Badge variant="neutral">{d.fraicheurProvenance.provenance}</Badge>
      </Dimension>
      <dl className="-mt-2 grid grid-cols-2 gap-x-3 gap-y-1 pl-3 text-2xs text-muted-foreground">
        <dt>Identifiant source</dt>
        <dd className="text-foreground">{d.fraicheurProvenance.identifiantSource}</dd>
        <dt>Dernière vérification</dt>
        <dd className="text-foreground">{formaterDate(d.fraicheurProvenance.dateDerniereVerification)}</dd>
        <dt>Version de formulation</dt>
        <dd className="text-foreground">v{d.fraicheurProvenance.versionFormulation}</dd>
        <dt>Statut</dt>
        <dd className="text-foreground">{d.fraicheurProvenance.statutLabel}</dd>
      </dl>

      {/* Références scientifiques (SupplementSourceReference). */}
      <section className="rounded-lg border border-border p-3">
        <h4 className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
          Références scientifiques
        </h4>
        {fiche.referencesScientifiques.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Aucune référence rattachée — les liens cliniques s&apos;activent à la validation des règles.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-foreground">
            {fiche.referencesScientifiques.map((r) => (
              <li key={r.id}>
                {r.lienUrl ? (
                  <a href={r.lienUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    {r.citation}
                  </a>
                ) : (
                  r.citation
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rayon corpus micronutrition — claims validés (barrière D-003). */}
      <section className="rounded-lg border border-border p-3" aria-label="Citations du corpus">
        <h4 className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
          Corpus micronutrition — claims validés
        </h4>
        {corpusEnCours ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Lecture du corpus…</p>
        ) : corpusEchec ? (
          <p role="alert" className="mt-1.5 text-xs text-status-danger">
            Lecture du corpus impossible pour le moment.
          </p>
        ) : corpus && corpus.claims.length > 0 ? (
          <ul className="mt-1.5 flex flex-col gap-2 text-xs text-foreground">
            {corpus.claims.map((c) => (
              <li key={`${c.claimId}-${c.versionClaim}`} className="border-l-2 border-border pl-2">
                <p>« {c.texteNormalise} »</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {c.classeAutorite} · niveau de preuve {c.niveauPreuve}
                  {c.validateur ? ` · validé par ${c.validateur}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {corpus?.message ?? 'Corpus en cours de constitution.'}
          </p>
        )}
      </section>
    </div>
  );
}
