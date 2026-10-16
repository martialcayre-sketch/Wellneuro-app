'use client';

// LA RELECTURE D'UNE VERSION DE FICHE D'USAGE, RUBRIQUE PAR RUBRIQUE
// ([[D-314]] §3, arbitrage 5 ; patron de `RelectureFicheAssiette`).
//
// UN ACTE PAR RUBRIQUE : chaque rubrique se relit, se valide ou se retire
// seule. La version n'est valide que si toutes ses rubriques attendues le
// sont — le serveur le dérive, l'écran l'affiche, il ne le calcule pas.
//
// L'ACTE PORTE SUR CE QUI EST AFFICHÉ : l'écran renvoie l'empreinte du texte
// montré et le jeton du dernier acte vu. Si l'un a bougé, la route refuse (409)
// et l'écran recharge — jamais d'acte sur un état que personne n'a vu.
//
// AUCUNE ÉDITION ICI (`DC-16`) : une correction passe par une nouvelle version,
// rédigée hors ligne et déposée par la voie d'ingestion.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { VersionFicheUsageApiResponse } from '@/app/api/praticien/fiches-usage/version/route';
import type { ActeFicheUsageApiResponse } from '@/lib/fiches-usage/actesHttp';
import type { DetailVersionUsage, RubriqueDetaillee } from '@/lib/fiches-usage/lecture';
import type { ActeFicheUsage } from '@/lib/fiches-usage/vocabulaire';
import { GesteTexte } from './GesteTexte';
import { formatDateHeure, libelleEtatTexte, libelleEtatVersion, nomRubrique, obstacleDeVersion } from './libelles';

// Les refus après lesquels ce qui est affiché n'est plus l'état de la base.
export const REFUS_A_RECHARGER = new Set([
  'empreinte_divergente',
  'etat_divergent',
  'etat_illisible',
  'deja_dans_cet_etat',
  'version_depassee',
  'structure',
  'contenu_illisible',
  'introuvable',
  'rubrique_absente',
]);

type Retour = { type: 'succes' | 'erreur'; texte: string };

export function RelectureFicheUsage({ idVersion, onFermer }: { idVersion: string; onFermer: () => void }) {
  const [detail, setDetail] = useState<DetailVersionUsage | null>(null);
  const [enCours, setEnCours] = useState(true);
  const [echec, setEchec] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const sequence = useRef(0);
  const envoiRef = useRef(false);
  const titreRef = useRef<HTMLHeadingElement>(null);
  const idTitre = useId();

  const charger = useCallback(async (): Promise<DetailVersionUsage | null> => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setEchec(null);
    try {
      const res = await fetch(`/api/praticien/fiches-usage/version?id=${encodeURIComponent(idVersion)}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as VersionFicheUsageApiResponse;
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

  const idAffiche = detail?.id ?? null;
  useEffect(() => {
    if (idAffiche) titreRef.current?.focus();
  }, [idAffiche]);

  async function poserActe(r: RubriqueDetaillee, acte: ActeFicheUsage, relecture: boolean, motifSaisi: string) {
    if (!detail || envoiRef.current) return;
    envoiRef.current = true;
    setEnvoi(true);
    setRetour(null);
    const idVersion = detail.id;
    const rubrique = r.rubrique;
    const empreinteVue = r.empreinte;
    const dernierActeVu = r.dernierActe;
    const relectureIntegrale = acte === 'validee' ? relecture : undefined;
    const motif = acte === 'retiree' ? motifSaisi : undefined;
    try {
      const res = await fetch('/api/praticien/fiches-usage/actes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idVersion, rubrique, acte, empreinteVue, dernierActeVu, relectureIntegrale, motif }),
      });
      const json = (await res.json()) as ActeFicheUsageApiResponse;
      if (json.ok) {
        const fait = `${nomRubrique(rubrique)} : ${acte === 'validee' ? 'rubrique validée' : 'rubrique retirée'}.`;
        const relue = await charger();
        setRetour({
          type: 'succes',
          texte: relue ? `${fait} Version : ${libelleEtatVersion(relue.etat).texte.toLowerCase()}.` : fait,
        });
      } else {
        setRetour({ type: 'erreur', texte: json.error || 'Acte refusé.' });
        if (REFUS_A_RECHARGER.has(json.reason)) await charger();
      }
    } catch {
      // La réponse s'est perdue : l'acte a pu être écrit avant. L'écran n'en
      // affirme rien et relit l'état réel.
      setRetour({ type: 'erreur', texte: 'Réponse perdue : l’acte a pu être enregistré — la relecture est rechargée.' });
      await charger();
    } finally {
      envoiRef.current = false;
      setEnvoi(false);
    }
  }

  return (
    <section aria-labelledby={idTitre} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div>
          <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={onFermer}>
            ← Retour aux fiches d’usage
          </Button>
        </div>
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
            Relecture d’une fiche d’usage
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
              Relecture · fiche d’usage
            </p>
            <h3
              id={idTitre}
              ref={titreRef}
              tabIndex={-1}
              className="rounded-sm font-display text-2xl font-bold tracking-[-0.02em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="font-mono">{detail.ficheId}</span>, v{detail.numero}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={libelleEtatVersion(detail.etat).variante}>{libelleEtatVersion(detail.etat).texte}</Badge>
              {enCours && (
                <span role="status" className="text-xs text-muted-foreground">
                  Actualisation…
                </span>
              )}
            </div>
          </div>

          <EtatDetaille detail={detail} />
          <Provenance detail={detail} />

          <ol aria-label="Rubriques" className="flex flex-col gap-4">
            {detail.rubriques.map(r => (
              <Rubrique
                key={r.rubrique}
                rubrique={r}
                obstacle={obstacleDeVersion(detail.etat, detail.structureSignee)}
                envoi={envoi || enCours}
                onConfirmer={(acte, relecture, motif) => void poserActe(r, acte, relecture, motif)}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function EtatDetaille({ detail }: { detail: DetailVersionUsage }) {
  const etat = detail.etat;
  const lignes: string[] = [];
  if (!detail.structureSignee) {
    lignes.push('La structure des fiches d’usage n’est pas signée : la relecture est possible, la validation ne l’est pas.');
  }
  if (etat.etat === 'non_conforme') {
    if (etat.manquantes.length > 0) lignes.push(`Rubriques attendues absentes : ${etat.manquantes.map(nomRubrique).join(', ')}.`);
    if (etat.enTrop.length > 0) lignes.push(`Rubriques non attendues : ${etat.enTrop.map(nomRubrique).join(', ')}.`);
  }
  if (etat.etat === 'retiree') lignes.push(`Rubriques retirées : ${etat.rubriques.map(nomRubrique).join(', ')}.`);
  if (etat.etat === 'illisible') lignes.push(`Rubriques à l’état illisible : ${etat.rubriques.map(nomRubrique).join(', ')}.`);
  if (etat.etat === 'a_relire') lignes.push('Cette version a été rédigée pour une autre structure que celle du jour.');
  if (etat.etat === 'hors_structure') lignes.push('La structure du jour ne déclare pas cette fiche.');
  if (lignes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-status-warning/40 bg-status-warning/10 px-4 py-2.5 text-sm text-foreground">
      {lignes.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  );
}

function Provenance({ detail }: { detail: DetailVersionUsage }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground shadow-card sm:grid-cols-[auto_1fr]">
      <dt className="font-medium">Déposée le</dt>
      <dd>{formatDateHeure(detail.creeLe)}</dd>
      <dt className="font-medium">Modèle rédacteur</dt>
      <dd className="font-mono">{detail.modeleRedaction}</dd>
      <dt className="font-medium">Modèle contre-lecteur</dt>
      <dd className="font-mono">{detail.modeleContreLecture}</dd>
      <dt className="font-medium">Consigne</dt>
      <dd className="font-mono">{detail.versionConsigne}</dd>
    </dl>
  );
}

function Rubrique({
  rubrique,
  obstacle,
  envoi,
  onConfirmer,
}: {
  rubrique: RubriqueDetaillee;
  obstacle: string | null;
  envoi: boolean;
  onConfirmer: (acte: ActeFicheUsage, relecture: boolean, motif: string) => void;
}) {
  const { texte, variante } = libelleEtatTexte(rubrique.etat);
  const etat = rubrique.etat;
  return (
    <li
      data-testid={`rubrique-${rubrique.rubrique}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">{nomRubrique(rubrique.rubrique)}</h4>
        <Badge variant={variante}>{texte}</Badge>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{rubrique.texte}</p>
      {(etat.etat === 'validee' || etat.etat === 'retiree') && (
        <p className="text-xs text-muted-foreground">
          {etat.etat === 'validee' ? 'Validée' : 'Retirée'} le {formatDateHeure(etat.le)} par {etat.validateur}
          {etat.etat === 'retiree' && <> — motif : {etat.motif}</>}
        </p>
      )}
      <GesteTexte
        // Une instance par texte affiché et par dernier acte : la déclaration
        // retombe dès que l'un ou l'autre change.
        key={`${rubrique.empreinte}:${rubrique.dernierActe ?? ''}`}
        nomDuTexte="cette rubrique"
        etat={etat}
        obstacle={obstacle}
        envoi={envoi}
        onConfirmer={onConfirmer}
      />
    </li>
  );
}
