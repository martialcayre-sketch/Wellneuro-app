'use client';

// LE RAYON « FICHES D'USAGE » DE LA PAGE BIOLOGIE ([[D-314]] §3 ; placé près
// du parcours biologique, arbitrage du 2026-10-16) : les fiches
// du besoin 2 que déclare la structure signée, leurs versions déposées, et le
// vocabulaire (libellés des hypothèses et des populations d'usage), chacun
// validé par un acte du praticien.
//
// CE QUI EST HORS STRUCTURE RESTE VISIBLE : une fiche ou un terme déposé que
// la structure du jour ne déclare pas s'affiche comme tel (`DC-24`) — jamais
// tu, jamais validable.
//
// RIEN DE CE RAYON N'ATTEINT UN PATIENT (§7) : aucune surface patient, aucun
// envoi, aucune remise. Pas de drapeau : la relecture n'émet rien.
//
// Les types seulement, depuis les modules serveur : un import de valeur tirerait
// Prisma dans le bundle client.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { RayonFichesUsageApiResponse } from '@/app/api/praticien/fiches-usage/route';
import type { ActeFicheUsageApiResponse } from '@/lib/fiches-usage/actesHttp';
import type { FicheDuRayon, LibelleDuRayon, RayonFichesUsage, TermeDuRayon } from '@/lib/fiches-usage/lecture';
import type { ActeFicheUsage } from '@/lib/fiches-usage/vocabulaire';
import { GesteTexte } from './GesteTexte';
import {
  NOM_NATURE,
  formatDateHeure,
  libelleEtatLibelle,
  libelleEtatVersion,
  nomRubrique,
  obstacleDeLibelle,
  RESERVE_AU_RESPONSABLE,
} from './libelles';
import { REFUS_A_RECHARGER, RelectureFicheUsage } from './RelectureFicheUsage';

type Retour = { type: 'succes' | 'erreur'; texte: string };

export function RayonFichesUsagePanel() {
  const [rayon, setRayon] = useState<RayonFichesUsage | null>(null);
  const [peutDecider, setPeutDecider] = useState(false);
  const [enCours, setEnCours] = useState(true);
  const [echec, setEchec] = useState<string | null>(null);
  const [versionOuverte, setVersionOuverte] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const sequence = useRef(0);
  const envoiRef = useRef(false);

  const charger = useCallback(async () => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setEchec(null);
    // Jamais l'ancien rayon pendant qu'on relit : au retour d'un acte, il
    // afficherait l'état d'avant.
    setRayon(null);
    try {
      const res = await fetch('/api/praticien/fiches-usage', { cache: 'no-store' });
      const json = (await res.json()) as RayonFichesUsageApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setEchec(!json.ok && json.error ? json.error : 'Impossible de charger les fiches d’usage.');
        return;
      }
      setRayon(json.rayon);
      setPeutDecider(json.peutDecider === true);
    } catch {
      if (!perimee()) setEchec('Impossible de charger les fiches d’usage.');
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }, []);

  useEffect(() => {
    void charger();
    return () => {
      sequence.current += 1;
    };
  }, [charger]);

  const titreRef = useRef<HTMLHeadingElement>(null);
  const retourDeRelecture = useRef(false);
  useEffect(() => {
    if (versionOuverte !== null || !retourDeRelecture.current) return;
    retourDeRelecture.current = false;
    titreRef.current?.focus();
  }, [versionOuverte]);

  async function poserActeLibelle(l: LibelleDuRayon, acte: ActeFicheUsage, relecture: boolean, motifSaisi: string) {
    if (envoiRef.current) return;
    envoiRef.current = true;
    setEnvoi(true);
    setRetour(null);
    const idLibelle = l.id;
    const empreinteVue = l.libelleSha256;
    const dernierActeVu = l.dernierActe;
    const relectureIntegrale = acte === 'validee' ? relecture : undefined;
    const motif = acte === 'retiree' ? motifSaisi : undefined;
    try {
      const res = await fetch('/api/praticien/fiches-usage/libelles/actes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLibelle, acte, empreinteVue, dernierActeVu, relectureIntegrale, motif }),
      });
      const json = (await res.json()) as ActeFicheUsageApiResponse;
      if (json.ok) {
        setRetour({ type: 'succes', texte: acte === 'validee' ? 'Libellé validé.' : 'Libellé retiré.' });
        await charger();
      } else {
        setRetour({ type: 'erreur', texte: json.error || 'Acte refusé.' });
        if (REFUS_A_RECHARGER.has(json.reason)) await charger();
      }
    } catch {
      setRetour({ type: 'erreur', texte: 'Réponse perdue : l’acte a pu être enregistré — le rayon est rechargé.' });
      await charger();
    } finally {
      envoiRef.current = false;
      setEnvoi(false);
    }
  }

  if (versionOuverte) {
    return (
      <RelectureFicheUsage
        key={versionOuverte}
        idVersion={versionOuverte}
        onFermer={() => {
          retourDeRelecture.current = true;
          setVersionOuverte(null);
          setRetour(null);
          void charger();
        }}
      />
    );
  }

  return (
    <section aria-labelledby="rayon-fiches-usage-titre" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Rayon fiches d’usage · besoin 2, validées ici
        </p>
        <h3
          id="rayon-fiches-usage-titre"
          ref={titreRef}
          tabIndex={-1}
          className="rounded-sm font-display text-2xl font-bold tracking-[-0.02em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Fiches d’usage
        </h3>
        <p className="mt-1 max-w-2xl text-base text-muted-foreground">
          Le texte de chaque fiche est rédigé hors de l’application, puis se relit ici rubrique par
          rubrique : une version est validée quand toutes ses rubriques le sont. Les libellés des
          hypothèses et des populations se valident de la même façon. Rien de ce rayon n’est envoyé à
          un patient.
        </p>
      </div>

      <div role="status" aria-live="polite">
        {retour?.type === 'succes' && (
          <p className="rounded-lg border border-status-success/40 bg-status-success/10 px-4 py-2.5 text-sm text-status-success">
            {retour.texte}
          </p>
        )}
      </div>
      {retour?.type === 'erreur' && (
        <p
          role="alert"
          className="rounded-lg border border-status-danger/40 bg-status-danger/10 px-4 py-2.5 text-sm text-status-danger"
        >
          {retour.texte}
        </p>
      )}

      {enCours && rayon === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Chargement des fiches d’usage…
        </p>
      ) : echec || rayon === null ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-status-danger">
          <p>{echec ?? 'Impossible de charger les fiches d’usage.'}</p>
          <Button type="button" variant="outline" onClick={() => void charger()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <Structure rayon={rayon} />
          {!peutDecider && <p className="text-sm text-muted-foreground">{RESERVE_AU_RESPONSABLE}</p>}
          <section aria-labelledby="fiches-usage-fiches-titre" className="flex flex-col gap-3">
            <h4 id="fiches-usage-fiches-titre" className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
              Fiches
            </h4>
            {rayon.fiches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fiche déclarée ni déposée.</p>
            ) : (
              <ul aria-label="Fiches d’usage" className="flex flex-col gap-3">
                {rayon.fiches.map(f => (
                  <LigneFiche
                    key={f.ficheId}
                    fiche={f}
                    signee={rayon.structure.signee}
                    onRelire={setVersionOuverte}
                  />
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="fiches-usage-vocabulaire-titre" className="flex flex-col gap-3">
            <h4
              id="fiches-usage-vocabulaire-titre"
              className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink"
            >
              Vocabulaire
            </h4>
            {rayon.termes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun terme déclaré ni déposé.</p>
            ) : (
              <ul aria-label="Termes du vocabulaire" className="flex flex-col gap-3">
                {rayon.termes.map(t => (
                  <LigneTerme
                    key={t.termeId}
                    terme={t}
                    signee={rayon.structure.signee}
                    peutDecider={peutDecider}
                    envoi={envoi || enCours}
                    onConfirmer={(l, acte, relecture, motif) => void poserActeLibelle(l, acte, relecture, motif)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function Structure({ rayon }: { rayon: RayonFichesUsage }) {
  const { signee, fiches, termes } = rayon.structure;
  return (
    <div
      className={`rounded-lg border px-4 py-2.5 text-sm ${
        signee ? 'border-border bg-surface text-foreground' : 'border-status-warning/40 bg-status-warning/10 text-foreground'
      }`}
    >
      {signee ? (
        <p>
          Structure signée : {fiches} fiche{fiches > 1 ? 's' : ''}, {termes} terme{termes > 1 ? 's' : ''} déclaré
          {termes > 1 ? 's' : ''}.
        </p>
      ) : (
        <p>
          La structure des fiches d’usage n’est pas encore signée : les textes déposés se relisent, aucun
          ne se valide avant elle.
        </p>
      )}
    </div>
  );
}

function LigneFiche({
  fiche,
  signee,
  onRelire,
}: {
  fiche: FicheDuRayon;
  signee: boolean;
  onRelire: (idVersion: string) => void;
}) {
  const versions = [...fiche.versions].sort((a, b) => b.numero - a.numero);
  const derniere = versions[0] ?? null;
  const reference = versions.find(v => v.id === fiche.reference) ?? null;
  return (
    <li
      data-testid={`fiche-usage-${fiche.ficheId}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="break-all font-mono text-sm font-medium text-foreground">{fiche.ficheId}</p>
        <p className="text-xs text-muted-foreground">
          {fiche.declaree
            ? `${fiche.rubriquesAttendues.length} rubrique${fiche.rubriquesAttendues.length > 1 ? 's' : ''} attendue${fiche.rubriquesAttendues.length > 1 ? 's' : ''}`
            : 'Non déclarée par la structure du jour'}
          {fiche.population && (
            <>
              {' '}
              · population <span className="font-mono">{fiche.population}</span>
            </>
          )}
        </p>
        {fiche.declaree && fiche.rubriquesAttendues.length > 0 && (
          <p className="text-xs text-muted-foreground">{fiche.rubriquesAttendues.map(nomRubrique).join(' · ')}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {versions.length === 0
            ? 'Aucune version déposée'
            : reference
              ? `Version de référence : v${reference.numero}`
              : 'Aucune version de référence'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {derniere ? (
          <>
            <Badge variant={libelleEtatVersion(derniere.etat, signee).variante}>
              v{derniere.numero} · {libelleEtatVersion(derniere.etat, signee).texte}
            </Badge>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onRelire(derniere.id)}>
              Relire la v{derniere.numero}
            </Button>
          </>
        ) : (
          <Badge variant="neutral">Aucune version</Badge>
        )}
        {reference && reference.id !== derniere?.id && (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onRelire(reference.id)}>
            Relire la v{reference.numero} (référence)
          </Button>
        )}
      </div>
    </li>
  );
}

function LigneTerme({
  terme,
  signee,
  peutDecider,
  envoi,
  onConfirmer,
}: {
  terme: TermeDuRayon;
  signee: boolean;
  peutDecider: boolean;
  envoi: boolean;
  onConfirmer: (l: LibelleDuRayon, acte: ActeFicheUsage, relecture: boolean, motif: string) => void;
}) {
  const libelles = [...terme.libelles].sort((a, b) => b.numero - a.numero);
  return (
    <li
      data-testid={`terme-${terme.termeId}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-all font-mono text-sm font-medium text-foreground">{terme.termeId}</p>
        <Badge variant="neutral">{NOM_NATURE[terme.nature] ?? terme.nature}</Badge>
        {!terme.declare && <Badge variant="warning">Non déclaré par la structure</Badge>}
      </div>
      {libelles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun libellé déposé.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {libelles.map(l => {
            const { texte, variante } = libelleEtatLibelle(l.etat, terme.reference === l.id, signee);
            return (
              <li key={l.id} className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={variante}>
                    v{l.numero} · {texte}
                  </Badge>
                  <span className="text-xs text-muted-foreground">déposé le {formatDateHeure(l.creeLe)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{l.libelle}</p>
                <GesteTexte
                  key={`${l.libelleSha256}:${l.dernierActe ?? ''}`}
                  nomDuTexte="ce libellé"
                  etat={l.etatTexte}
                  obstacle={obstacleDeLibelle(l.etat, signee, l.depasse)}
                  peutDecider={peutDecider}
                  envoi={envoi}
                  onConfirmer={(acte, relecture, motif) => onConfirmer(l, acte, relecture, motif)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}
