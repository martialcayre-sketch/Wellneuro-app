'use client';

// LA RELECTURE D'UNE VERSION DE FICHE D'ASSIETTE ET L'ACTE DU RESPONSABLE
// ([[D-251]] §5 à §7, lot 6).
//
// LA SURFACE DE RELECTURE PRÉCÈDE L'ATTESTATION (D-195 §2) : la source et
// l'adaptation côte à côte, le texte de chaque claim cité, les réserves de
// sécurité attendues même non citées, et les contrôles REJOUÉS à l'ouverture.
// La déclaration de relecture intégrale n'apparaît qu'une fois tout cela chargé,
// et retombe à faux à chaque rechargement : elle vaut pour ce qui est affiché.
//
// L'ACTE PORTE SUR CE QUI EST AFFICHÉ : l'écran renvoie l'empreinte du contenu
// montré et le jeton du dernier acte vu. Si l'un a bougé, la route refuse (409)
// et l'écran recharge — jamais d'acte sur un état que personne n'a vu.
//
// AUCUNE ÉDITION ICI (`DC-16`) : une correction passe par une nouvelle version,
// produite hors ligne et déposée par la voie d'ingestion.
//
// Le corps de l'acte s'écrit à plat dans `JSON.stringify({ … })` : la garde
// `actes/confirmations.guard.test.ts` y lit les clés envoyées.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ActeFicheApiResponse } from '@/app/api/praticien/fiches-assiette/actes/route';
import type { VersionFicheApiResponse } from '@/app/api/praticien/fiches-assiette/version/route';
import { derniereVersionValidee, MOTIF_MAX, type ActeFiche } from '@/lib/fiches-assiette/etat';
import type { ClaimCite, DetailVersionFiche } from '@/lib/fiches-assiette/lecture';
import type { ContenuFicheAssiette } from '@/lib/fiches-assiette/types';
import { RAISON_ILLISIBLE, formatDateHeure, libelleEtat } from './libelles';

// Les refus après lesquels ce qui est affiché n'est plus l'état de la base :
// l'écran recharge la relecture (et la déclaration retombe).
const REFUS_A_RECHARGER = new Set([
  'empreinte_divergente',
  'etat_divergent',
  'etat_illisible',
  'deja_dans_cet_etat',
  'version_depassee',
  'controle',
  'version_introuvable',
]);

// Le marqueur de page que l'outil d'adaptation pose dans le texte source
// (`tools/corpus/fiches/lib/entrees.mjs`). Une ligne qui ne s'y conforme pas
// s'affiche telle quelle : rien n'est retiré de la source.
const RE_MARQUEUR_PAGE = /^<!-- page (\d+) \(lecture [A-Z]\) -->$/;

type Morceau = { type: 'page'; numero: string } | { type: 'texte'; texte: string };

function morceauxDeLaSource(texte: string): Morceau[] {
  const morceaux: Morceau[] = [];
  let courant: string[] = [];
  const pousser = () => {
    if (courant.some(l => /\S/u.test(l))) morceaux.push({ type: 'texte', texte: courant.join('\n') });
    courant = [];
  };
  for (const ligne of texte.split('\n')) {
    const marqueur = RE_MARQUEUR_PAGE.exec(ligne.trim());
    if (marqueur) {
      pousser();
      morceaux.push({ type: 'page', numero: marqueur[1] });
    } else {
      courant.push(ligne);
    }
  }
  pousser();
  return morceaux;
}

type Retour = { type: 'succes' | 'erreur'; texte: string };

/** La version de référence de la fiche, d'après une version relue et ses sœurs. */
function phraseReference(detail: DetailVersionFiche): string {
  const reference = derniereVersionValidee([
    { id: detail.id, numero: detail.numero, etat: detail.etat },
    ...detail.autresVersions,
  ]);
  return reference ? `Version de référence : v${reference.numero}.` : 'Aucune version de référence.';
}

export function RelectureFicheAssiette({
  idVersion,
  onFermer,
  onOuvrirVersion,
}: {
  idVersion: string;
  onFermer: () => void;
  onOuvrirVersion: (idVersion: string) => void;
}) {
  const [detail, setDetail] = useState<DetailVersionFiche | null>(null);
  const [enCours, setEnCours] = useState(true);
  const [echec, setEchec] = useState<string | null>(null);
  const [relectureDeclaree, setRelectureDeclaree] = useState(false);
  const [geste, setGeste] = useState<ActeFiche | null>(null);
  const [motifSaisi, setMotifSaisi] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const sequence = useRef(0);
  const envoiRef = useRef(false);
  const titreRef = useRef<HTMLHeadingElement>(null);
  const idTitre = useId();
  const idMotif = useId();

  // Rend la version relue — ou `null` si la lecture a échoué ou a été dépassée.
  const charger = useCallback(async (): Promise<DetailVersionFiche | null> => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setEchec(null);
    // Ce qui était déclaré valait pour l'affichage précédent.
    setRelectureDeclaree(false);
    setGeste(null);
    setMotifSaisi('');
    try {
      const res = await fetch(`/api/praticien/fiches-assiette/version?id=${encodeURIComponent(idVersion)}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as VersionFicheApiResponse;
      if (perimee()) return null;
      if (!res.ok || !json.ok) {
        setDetail(null);
        setEchec(!json.ok && json.error ? json.error : 'Impossible de charger cette version.');
        return null;
      }
      setDetail(json.version);
      return json.version;
    } catch {
      if (!perimee()) {
        setDetail(null);
        setEchec('Impossible de charger cette version.');
      }
      return null;
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }, [idVersion]);

  useEffect(() => {
    setDetail(null);
    setRetour(null);
    void charger();
    return () => {
      sequence.current += 1;
    };
  }, [charger]);

  // Le focus va au titre à chaque version ouverte, pas à chaque rechargement.
  const idAffiche = detail?.id ?? null;
  useEffect(() => {
    if (idAffiche) titreRef.current?.focus();
  }, [idAffiche]);

  async function poserActe(acte: ActeFiche) {
    if (!detail || envoiRef.current) return;
    if (acte === 'validee' && !relectureDeclaree) return;
    if (acte === 'retiree' && !/\S/u.test(motifSaisi)) return;
    envoiRef.current = true;
    setEnvoi(true);
    setRetour(null);
    const numero = detail.numero;
    const idVersion = detail.id;
    const contenuSha256Vu = detail.contenuSha256;
    const dernierActeVu = detail.dernierActe;
    // La déclaration vient de la case, jamais d'une constante (D-195 §1).
    const relectureIntegrale = acte === 'validee' ? relectureDeclaree : undefined;
    const motif = acte === 'retiree' ? motifSaisi.trim() : undefined;
    try {
      const res = await fetch('/api/praticien/fiches-assiette/actes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idVersion, acte, contenuSha256Vu, dernierActeVu, relectureIntegrale, motif }),
      });
      const json = (await res.json()) as ActeFicheApiResponse;
      if (json.ok) {
        const fait = acte === 'validee' ? `Version ${numero} validée.` : `Version ${numero} retirée.`;
        // La référence se dit d'après la version RELUE, pas d'après l'annonce
        // faite avant l'acte : un autre onglet a pu valider entre-temps
        // (constat de revue). Un seul texte, posé une fois : la région vivante
        // ne l'annonce pas deux fois.
        const relue = await charger();
        setRetour({ type: 'succes', texte: relue ? `${fait} ${phraseReference(relue)}` : fait });
        titreRef.current?.focus();
      } else {
        setRetour({ type: 'erreur', texte: json.error || 'Acte refusé.' });
        if (REFUS_A_RECHARGER.has(json.reason)) await charger();
      }
    } catch {
      // La réponse s'est perdue : l'acte a pu être écrit avant. L'écran n'en
      // affirme rien et relit l'état réel (constat de revue).
      setRetour({ type: 'erreur', texte: 'Réponse perdue : l’acte a pu être enregistré — la relecture est rechargée.' });
      await charger();
    } finally {
      envoiRef.current = false;
      setEnvoi(false);
    }
  }

  const claims = useMemo(() => new Map((detail?.claimsCites ?? []).map(c => [c.cle, c])), [detail]);

  return (
    <section aria-labelledby={idTitre} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Fermé pendant un acte en vol : la liste relue avant le COMMIT
              afficherait l'état d'avant (constat de revue). */}
          <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={onFermer}>
            ← Retour aux fiches
          </Button>
        </div>
        {/* Région vivante rendue EN PERMANENCE : une région créée déjà remplie
            n'est pas annoncée de façon fiable. */}
        <div role="status" aria-live="polite">
          {retour?.type === 'succes' && (
            <p className="rounded-lg border border-status-success/40 bg-status-success/10 px-4 py-2.5 text-sm text-status-success">
              {retour.texte}
            </p>
          )}
        </div>
      </div>

      {retour?.type === 'erreur' && (
        <p
          role="alert"
          className="rounded-lg border border-status-danger/40 bg-status-danger/10 px-4 py-2.5 text-sm text-status-danger"
        >
          {retour.texte}
        </p>
      )}

      {detail === null ? (
        <>
          <h3 id={idTitre} className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
            Relecture d’une fiche
          </h3>
          {enCours ? (
            <p role="status" className="text-sm text-muted-foreground">
              Chargement de la version…
            </p>
          ) : (
            <div role="alert" className="flex flex-col items-start gap-2 text-sm text-status-danger">
              <p>{echec ?? 'Impossible de charger cette version.'}</p>
              <Button type="button" variant="outline" onClick={() => void charger()}>
                Réessayer
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
              Relecture · {detail.sourceId}
            </p>
            <h3
              id={idTitre}
              ref={titreRef}
              tabIndex={-1}
              className="rounded-sm font-display text-2xl font-bold tracking-[-0.02em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Relecture — {detail.libelle}, v{detail.numero}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={libelleEtat(detail.etat).variante}>{libelleEtat(detail.etat).texte}</Badge>
              {detail.etat.etat === 'illisible' && (
                <span className="text-xs text-status-danger">{RAISON_ILLISIBLE[detail.etat.raison]}</span>
              )}
              {enCours && (
                <span role="status" className="text-xs text-muted-foreground">
                  Actualisation…
                </span>
              )}
            </div>
          </div>

          <Anomalies detail={detail} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section
              aria-label="Texte source"
              data-testid="relecture-source"
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card lg:max-h-[75vh] lg:overflow-y-auto"
            >
              <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
                1 · Source — la Fiche MY
              </h4>
              <p className="text-xs text-muted-foreground">
                Le texte extrait, tel que l’adaptation l’a lu : aucun rendu, aucune coupe.
              </p>
              {morceauxDeLaSource(detail.texteSource).map((m, i) =>
                m.type === 'page' ? (
                  <p
                    key={i}
                    className="border-t border-dashed border-border pt-2 text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground"
                  >
                    Page {m.numero}
                  </p>
                ) : (
                  <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {m.texte}
                  </p>
                ),
              )}
            </section>

            <section
              aria-label="Adaptation"
              data-testid="relecture-adaptation"
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card lg:max-h-[75vh] lg:overflow-y-auto"
            >
              <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
                2 · Adaptation — ce que le patient lirait
              </h4>
              {detail.contenu ? (
                <Adaptation contenu={detail.contenu} claims={claims} />
              ) : (
                <p className="text-sm text-status-danger">
                  Le contenu rangé en base ne se relit pas : aucun rendu partiel n’est proposé.
                </p>
              )}
            </section>
          </div>

          <Reserves detail={detail} />
          <Provenance detail={detail} />
          <Historique detail={detail} envoi={envoi} onOuvrirVersion={onOuvrirVersion} />

          <Gestes
            detail={detail}
            envoi={envoi || enCours}
            relectureDeclaree={relectureDeclaree}
            onDeclarer={setRelectureDeclaree}
            geste={geste}
            onGeste={g => {
              setGeste(g);
              setMotifSaisi('');
              setRetour(null);
            }}
            motifSaisi={motifSaisi}
            onMotif={setMotifSaisi}
            idMotif={idMotif}
            onConfirmer={acte => void poserActe(acte)}
          />
        </>
      )}
    </section>
  );
}

function Anomalies({ detail }: { detail: DetailVersionFiche }) {
  const n = detail.anomalies.length;
  // Validée hier, une version peut ne plus passer aujourd'hui (réserve publiée
  // depuis, claim retiré) : les contrôles sont rejoués à chaque ouverture (§6).
  const consequence =
    detail.etat.etat === 'validee'
      ? 'validée auparavant, cette version ne passerait plus les contrôles aujourd’hui.'
      : 'cette version ne peut pas être validée.';
  if (n === 0) {
    return (
      <div role="status" className="rounded-lg border border-status-success/40 bg-status-success/10 px-4 py-2.5 text-sm text-status-success">
        <p>Aucune anomalie : les contrôles rejoués à l’ouverture passent.</p>
        <p className="mt-1 text-xs">
          Ils ne voient ni un nombre écrit en lettres, ni un glissement de sens, ni une population
          élargie : c’est la relecture intégrale qui les garde.
        </p>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col gap-1 rounded-lg border border-status-danger/40 bg-status-danger/10 px-4 py-2.5 text-sm text-status-danger"
    >
      <p className="font-medium">
        {n === 1 ? 'Une anomalie' : `${n} anomalies`} : {consequence}
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {detail.anomalies.map((a, i) => (
          <li key={i}>
            {a.detail} <span className="font-mono opacity-80">({a.code})</span>
          </li>
        ))}
      </ul>
      <p className="text-xs">Une correction passe par une nouvelle version, adaptée hors ligne puis déposée.</p>
    </div>
  );
}

function ClaimsDuBloc({ cles, claims }: { cles: readonly string[]; claims: Map<string, ClaimCite> }) {
  return (
    <ul className="mt-1 flex flex-col gap-1 border-l-2 border-border pl-3">
      {cles.map(cle => {
        const claim = claims.get(cle);
        return (
          <li key={cle} className="text-xs text-muted-foreground">
            <span className="font-mono">{cle}</span> —{' '}
            {claim?.texte ? (
              <span className="whitespace-pre-wrap break-words">{claim.texte}</span>
            ) : (
              <span className="text-status-danger">ce claim n’est pas VALIDE au corpus aujourd’hui.</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Adaptation({ contenu, claims }: { contenu: ContenuFicheAssiette; claims: Map<string, ClaimCite> }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="break-words font-display text-lg font-semibold text-foreground">{contenu.titre}</p>

      <div className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">Précautions</p>
        {contenu.precautions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune précaution.</p>
        ) : (
          contenu.precautions.map((p, i) => (
            <div key={i} className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{p.texte}</p>
              <ClaimsDuBloc cles={p.claims} claims={claims} />
            </div>
          ))
        )}
      </div>

      {contenu.sections.map((s, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className="break-words font-medium text-foreground">{s.titre}</p>
          {s.blocs.map((b, j) => (
            <div key={j} className="flex flex-col gap-1">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{b.texte}</p>
              {b.provenance.type === 'verbatim' ? (
                <span>
                  <Badge variant="neutral">Repris tel quel de la source</Badge>
                </span>
              ) : (
                <>
                  <span>
                    <Badge variant="info">
                      Reformulé depuis {b.provenance.claims.length} claim{b.provenance.claims.length > 1 ? 's' : ''}
                    </Badge>
                  </span>
                  <ClaimsDuBloc cles={b.provenance.claims} claims={claims} />
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Reserves({ detail }: { detail: DetailVersionFiche }) {
  const reserves = detail.claimsCites.filter(c => c.reserveAttendue);
  const portees = new Set((detail.contenu?.precautions ?? []).flatMap(p => p.claims));
  return (
    <section aria-label="Réserves de sécurité attendues" className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
        3 · Réserves de sécurité attendues
      </h4>
      {reserves.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune réserve publiée pour cette assiette : aucune précaution n’est attendue.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {reserves.map(r => (
            <li key={r.cle} className="text-sm">
              <span className="font-mono text-xs">{r.cle}</span>{' '}
              {/* Un contenu illisible ne dit rien de ses précautions : c'est un
                  inconnu, pas une absence (`DC-24`, constat de revue). */}
              {detail.contenu === null ? (
                <Badge variant="neutral">indéterminable : contenu illisible</Badge>
              ) : portees.has(r.cle) ? (
                <Badge variant="success">portée par une précaution</Badge>
              ) : (
                <Badge variant="danger">portée par aucune précaution</Badge>
              )}
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {r.texte ?? 'Ce claim n’est pas VALIDE au corpus aujourd’hui.'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Provenance({ detail }: { detail: DetailVersionFiche }) {
  const lignes: [string, string, boolean?][] = [
    ['Déposée le', formatDateHeure(detail.creeLe)],
    ['Rédaction', detail.modeleRedaction],
    ['Contre-lecture', detail.modeleFidelite],
    ['Consigne', detail.versionConsigne],
    ['Empreinte de la source', detail.sourceSha256, true],
    ['Empreinte du contenu', detail.contenuSha256, true],
  ];
  return (
    <section aria-label="Provenance de l’adaptation" className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
        4 · Provenance de l’adaptation
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Un modèle a rédigé, un second a contre-lu ; ni l’un ni l’autre n’atteste. L’empreinte de la
        source se confronte au manifeste du snapshot.
      </p>
      <dl className="mt-2 flex flex-col">
        {lignes.map(([terme, valeur, empreinte]) => (
          <div
            key={terme}
            className="flex flex-col gap-0.5 border-b border-dashed border-border py-1.5 text-xs last:border-b-0 sm:flex-row sm:justify-between sm:gap-3"
          >
            <dt className="text-muted-foreground">{terme}</dt>
            <dd className={empreinte ? 'break-all font-mono text-foreground' : 'text-foreground'}>{valeur}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Historique({
  detail,
  envoi,
  onOuvrirVersion,
}: {
  detail: DetailVersionFiche;
  envoi: boolean;
  onOuvrirVersion: (idVersion: string) => void;
}) {
  return (
    <section aria-label="Historique" className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">5 · Historique</h4>
      {detail.actes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun acte : cette version n’a jamais été validée ni retirée.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1.5 text-sm">
          {detail.actes.map(a => (
            <li key={a.ordre} className="text-foreground">
              {a.acte === 'validee' ? 'Validée' : a.acte === 'retiree' ? 'Retirée' : `Acte inconnu « ${a.acte} »`} le{' '}
              {formatDateHeure(a.le)} par {a.validateur}
              {a.acte === 'validee' && a.relectureIntegrale && ', relecture intégrale déclarée'}
              {a.motif && <span className="text-muted-foreground"> — motif : {a.motif}</span>}
            </li>
          ))}
        </ol>
      )}
      {detail.autresVersions.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">Autres versions</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {detail.autresVersions.map(v => (
              <li key={v.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={envoi}
                  onClick={() => onOuvrirVersion(v.id)}
                >
                  Relire la v{v.numero} · {libelleEtat(v.etat).texte}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Gestes({
  detail,
  envoi,
  relectureDeclaree,
  onDeclarer,
  geste,
  onGeste,
  motifSaisi,
  onMotif,
  idMotif,
  onConfirmer,
}: {
  detail: DetailVersionFiche;
  envoi: boolean;
  relectureDeclaree: boolean;
  onDeclarer: (v: boolean) => void;
  geste: ActeFiche | null;
  onGeste: (g: ActeFiche | null) => void;
  motifSaisi: string;
  onMotif: (m: string) => void;
  idMotif: string;
  onConfirmer: (acte: ActeFiche) => void;
}) {
  const etat = detail.etat.etat;
  const peutValider = etat === 'a_valider' || etat === 'retiree';
  const peutRetirer = etat === 'validee' || etat === 'a_valider';
  const plusRecenteValidee = detail.autresVersions.find(v => v.numero > detail.numero && v.etat.etat === 'validee');
  const obstacle =
    detail.contenu === null
      ? 'Le contenu ne se relit pas : cette version ne peut pas être validée.'
      : detail.anomalies.length > 0
        ? 'Les contrôles ne passent pas : cette version ne peut pas être validée.'
        : plusRecenteValidee
          ? `La v${plusRecenteValidee.numero}, plus récente, est déjà validée : cette version ne peut plus l’être.`
          : null;

  // Ce que le geste change à la version de référence — la plus récente
  // validée, au sens du numéro (§5). Retirer la référence rend ce rôle à la
  // précédente validée : l'écran le dit avant la confirmation. « Référence »,
  // pas « servie » : les contrôles sont rejoués au moment de remettre (§6).
  const moi = { id: detail.id, numero: detail.numero, etat: detail.etat };
  const referenceAvant = derniereVersionValidee([moi, ...detail.autresVersions]);
  const referenceApresRetrait = derniereVersionValidee(detail.autresVersions);
  const annonceRetrait =
    referenceAvant?.id === detail.id
      ? referenceApresRetrait
        ? `Cette version est la version de référence. Après le retrait, la v${referenceApresRetrait.numero} redeviendra la version de référence.`
        : 'Cette version est la version de référence. Après le retrait, cette fiche n’aura plus aucune version de référence.'
      : referenceAvant
        ? `Cette version n’est pas la version de référence : la v${referenceAvant.numero} le reste.`
        : 'Cette fiche n’a aucune version de référence : le retrait n’en change rien.';
  const annonceValidation = referenceAvant
    ? `Après la validation, cette version remplacera la v${referenceAvant.numero} comme version de référence.`
    : 'Après la validation, cette version deviendra la version de référence.';

  // Annuler rend le focus au bouton qui avait armé le geste : sans cela, le
  // bouton focalisé disparaît et le focus tombe sur la page (constat de revue).
  const validerRef = useRef<HTMLButtonElement>(null);
  const retirerRef = useRef<HTMLButtonElement>(null);
  const focusApresAnnulation = useRef<ActeFiche | null>(null);
  useEffect(() => {
    if (geste !== null || focusApresAnnulation.current === null) return;
    (focusApresAnnulation.current === 'validee' ? validerRef : retirerRef).current?.focus();
    focusApresAnnulation.current = null;
  }, [geste]);
  const annuler = (g: ActeFiche) => {
    focusApresAnnulation.current = g;
    onGeste(null);
  };

  if (etat === 'illisible') {
    return (
      <section aria-label="Décision" className="rounded-xl border border-status-danger/40 bg-status-danger/10 p-4 text-sm text-status-danger">
        L’état de cette version est illisible : aucun acte ne peut être posé.
      </section>
    );
  }

  return (
    <section
      aria-label="Décision"
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card"
    >
      <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">6 · Décision</h4>

      {peutValider && (
        <div className="flex flex-col gap-3">
          {obstacle ? (
            <p className="text-sm text-status-danger">{obstacle}</p>
          ) : (
            <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={relectureDeclaree}
                disabled={envoi}
                onChange={e => onDeclarer(e.target.checked)}
              />
              Je déclare avoir relu cette version en entier, source et adaptation côte à côte.
            </label>
          )}
          {geste === 'validee' ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                Signer la validation de la v{detail.numero} ? {annonceValidation}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  autoFocus
                  disabled={envoi || !relectureDeclaree || obstacle !== null}
                  onClick={() => onConfirmer('validee')}
                >
                  {envoi ? 'En cours…' : 'Confirmer la validation'}
                </Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={() => annuler('validee')}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button
                ref={validerRef}
                type="button"
                className="min-h-11"
                disabled={envoi || !relectureDeclaree || obstacle !== null || geste !== null}
                title={
                  obstacle ?? (relectureDeclaree ? undefined : 'Déclarez d’abord la relecture intégrale.')
                }
                onClick={() => onGeste('validee')}
              >
                Valider la fiche
              </Button>
            </div>
          )}
        </div>
      )}

      {peutRetirer && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {geste === 'retiree' ? (
            <>
              <p className="text-sm text-foreground">{annonceRetrait}</p>
              <label htmlFor={idMotif} className="text-sm font-medium text-foreground">
                Motif du retrait
              </label>
              <textarea
                id={idMotif}
                rows={3}
                maxLength={MOTIF_MAX}
                autoFocus
                value={motifSaisi}
                disabled={envoi}
                onChange={e => onMotif(e.target.value)}
                placeholder="Motif du retrait (obligatoire)"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="danger"
                  className="min-h-11"
                  disabled={envoi || !/\S/u.test(motifSaisi)}
                  onClick={() => onConfirmer('retiree')}
                >
                  {envoi ? 'En cours…' : 'Confirmer le retrait'}
                </Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={() => annuler('retiree')}>
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button
                ref={retirerRef}
                type="button"
                variant="danger"
                className="min-h-11"
                disabled={envoi || geste !== null}
                onClick={() => onGeste('retiree')}
              >
                Retirer la version
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
