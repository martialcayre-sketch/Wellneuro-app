'use client';

// L'ATELIER DES POSITIONS D'EXPERT (D-439 §2, §3, §5 ; BP-12b, PR 3) — surface
// PRIVÉE du praticien, derrière `WN_POSITIONS_EXPERT` éteint. Le responsable y
// verse une version de position, la signe (relecture intégrale) ou la retire
// (motif), et pose ou révoque l'arbitrage d'un conflit pour une fiche de sa
// liste curée. Les autres praticiens lisent, sans geste.
//
// AUCUN PRÉ-REMPLISSAGE (D-439 §3) : aucune option d'arbitrage n'est cochée
// d'avance, l'outil ne propose aucune des deux positions. Un arbitrage « à
// relire » ne s'affiche jamais comme courant (A3).
//
// Les types seulement, depuis les modules serveur : un import de valeur tirerait
// Prisma dans le bundle client.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { AtelierPositionsApiResponse } from '@/app/api/praticien/positions-expert/route';
import type { AtelierPositions, CoupleLu, PositionLue, VersionLue } from '@/lib/positions-expert/lecture';
import {
  DOSSIERS_POSITION,
  LIBELLE_POSITION,
  LIBELLES_CAUSES,
  LIBELLES_DOSSIERS,
  LIBELLES_RUBRIQUES,
  RUBRIQUES_POSITION,
  type ContenuPosition,
  type DossierPosition,
} from '@/lib/positions-expert/vocabulaire';

type Retour = { type: 'succes' | 'erreur'; texte: string };
type ReponseEcriture = { ok: true } | { ok: false; error: string; claims?: string[] };

const CHAMP = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

const LIBELLE_ETAT: Record<VersionLue['etat'], string> = {
  brouillon: 'Brouillon, non signée',
  signee: 'Signée',
  retiree: 'Retirée',
  illisible: 'État illisible',
};

async function ecrire(chemin: string, corps: unknown): Promise<ReponseEcriture> {
  try {
    const res = await fetch(`/api/praticien/positions-expert/${chemin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
    return (await res.json()) as ReponseEcriture;
  } catch {
    // Le client ne sait pas si l'écriture a eu lieu : une coupure peut suivre
    // le commit. L'écran se recharge ; le geste se vérifie sur l'état affiché
    // (revue PR-Agent de #1893). Un second envoi sur un état périmé est refusé
    // « état divergent ».
    return {
      ok: false,
      error: 'Réponse du serveur illisible : le résultat est inconnu. Vérifiez l’état affiché, rechargé, avant de recommencer.',
    };
  }
}

function texteErreur(r: ReponseEcriture): string {
  if (r.ok) return '';
  return r.claims && r.claims.length > 0 ? `${r.error} (${r.claims.join(', ')})` : r.error;
}

export function AtelierPositionsPanel() {
  const [atelier, setAtelier] = useState<AtelierPositions | null>(null);
  const [peutDecider, setPeutDecider] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Seule la réponse du DERNIER chargement s'applique : une lecture plus
  // ancienne, arrivée après, ne remplace pas un état plus récent (revue
  // CodeRabbit de #1893).
  const generation = useRef(0);

  const charger = useCallback(async () => {
    const mienne = ++generation.current;
    try {
      const res = await fetch('/api/praticien/positions-expert', { cache: 'no-store' });
      const data = (await res.json()) as AtelierPositionsApiResponse;
      if (mienne !== generation.current) return;
      if (!data.ok) {
        setErreur(data.error);
        return;
      }
      setErreur(null);
      setAtelier(data.atelier);
      setPeutDecider(data.peutDecider);
    } catch {
      if (mienne === generation.current) setErreur('L’atelier n’a pas pu être chargé.');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const soumettre = useCallback(
    async (chemin: string, corps: unknown, succes: string): Promise<boolean> => {
      setEnvoi(true);
      setRetour(null);
      const r = await ecrire(chemin, corps);
      setEnvoi(false);
      setRetour(r.ok ? { type: 'succes', texte: succes } : { type: 'erreur', texte: texteErreur(r) });
      await charger();
      return r.ok;
    },
    [charger],
  );

  const alerteLecture = erreur && (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-status-danger">
      <span>{erreur}{atelier ? ' Les gestes sont suspendus tant que l’état n’est pas relu.' : ''}</span>
      <Button type="button" variant="outline" onClick={() => void charger()}>
        Recharger
      </Button>
    </div>
  );
  if (!atelier) return alerteLecture || <p className="text-sm text-muted-foreground">Chargement de l’atelier…</p>;
  // Une lecture en échec après un premier chargement NE DÉMONTE RIEN : le
  // brouillon en cours reste à l'écran. Mais aucun geste ne part sur un état
  // qu'on n'a pas pu relire (revue CodeRabbit de #1893).
  const bloque = envoi || erreur !== null;

  return (
    <div className="flex flex-col gap-6">
      {alerteLecture}
      <p className="text-sm text-muted-foreground">
        Chaque position s’affiche « {LIBELLE_POSITION} », jamais comme un consensus. Elle cède devant
        toute source de rang supérieur qui la contredit, et ne déclenche aucune règle.
        {!peutDecider && ' Lecture seule : verser, signer, retirer et arbitrer sont réservés au responsable.'}
      </p>

      {retour && (
        <p role={retour.type === 'erreur' ? 'alert' : 'status'} className={retour.type === 'erreur' ? 'text-sm text-status-danger' : 'text-sm text-status-success'}>
          {retour.texte}
        </p>
      )}

      {peutDecider && <FormulaireVersion atelier={atelier} envoi={bloque} soumettre={soumettre} />}

      <section aria-labelledby="titre-positions" className="flex flex-col gap-4">
        <h3 id="titre-positions" className="font-display text-lg font-semibold text-foreground">
          Positions
        </h3>
        {atelier.positions.length === 0 && <p className="text-sm text-muted-foreground">Aucune position versée.</p>}
        {atelier.positions.map(p => (
          // Clé = la VERSION courante : une version neuve remonte la carte, et
          // la case « J'ai relu » d'une version ne vaut jamais pour la suivante
          // (D-195 §1 ; revue `wn-reviewer`).
          <CartePosition key={p.courante.id} position={p} peutDecider={peutDecider} envoi={bloque} soumettre={soumettre} />
        ))}
      </section>

      <SectionArbitrages atelier={atelier} peutDecider={peutDecider} envoi={bloque} soumettre={soumettre} />
    </div>
  );
}

type Soumettre = (chemin: string, corps: unknown, succes: string) => Promise<boolean>;

const CONTENU_VIDE: ContenuPosition = { enonce: '', perimetre: '', population: '', limites: '' };

function FormulaireVersion({ atelier, envoi, soumettre }: { atelier: AtelierPositions; envoi: boolean; soumettre: Soumettre }) {
  const [positionId, setPositionId] = useState('');
  const [version, setVersion] = useState('');
  const [dossier, setDossier] = useState<DossierPosition | ''>('');
  const [ficheId, setFicheId] = useState('');
  const [contenu, setContenu] = useState<ContenuPosition>(CONTENU_VIDE);
  const [appuis, setAppuis] = useState('');

  // La version courante VUE, que la nouvelle version révise : celle de la
  // position chargée, s'il y en a une.
  const existante = atelier.positions.find(p => p.positionId === positionId.trim()) ?? null;

  const envoyer = async () => {
    const contenuEnvoye = contenu;
    const versionEnvoyee = version;
    const ok = await soumettre(
      'versions',
      {
        positionId: positionId.trim(),
        version: version.trim(),
        dossier,
        ficheId: ficheId === '' ? null : ficheId,
        contenu,
        claimsAppui: appuis.split(/\s+/u).filter(a => a.length > 0),
        idVersionCouranteVue: existante?.courante.id ?? null,
      },
      'Version versée. Elle reste non signée tant que l’acte de signature n’est pas posé.',
    );
    // Ne vide que ce qui a été envoyé : une saisie faite pendant l'envoi reste
    // (revue CodeRabbit de #1893).
    if (ok) {
      setContenu(c => (c === contenuEnvoye ? CONTENU_VIDE : c));
      setVersion(v => (v === versionEnvoyee ? '' : v));
    }
  };

  return (
    <section aria-labelledby="titre-verser" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 id="titre-verser" className="font-display text-lg font-semibold text-foreground">
        Verser une version
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Identifiant de position (WN-PE-NNNN)
          <Input value={positionId} onChange={e => setPositionId(e.target.value)} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Version (vN.M)
          <Input value={version} onChange={e => setVersion(e.target.value)} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dossier de preuve
          <Select value={dossier} onChange={e => setDossier(e.target.value as DossierPosition | '')}>
            <option value="">Choisir…</option>
            {DOSSIERS_POSITION.map(d => (
              <option key={d} value={d}>
                {LIBELLES_DOSSIERS[d]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fiche d’usage fondée
          <Select value={ficheId} onChange={e => setFicheId(e.target.value)}>
            <option value="">Aucune fiche</option>
            {atelier.structure.fiches.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {existante && (
        <p className="text-sm text-muted-foreground">
          Cette version révisera la version courante {existante.courante.version} de {existante.positionId}.
        </p>
      )}
      {RUBRIQUES_POSITION.map(r => (
        <label key={r} className="flex flex-col gap-1 text-sm">
          {LIBELLES_RUBRIQUES[r]}
          <textarea className={CHAMP} rows={3} value={contenu[r]} onChange={e => setContenu({ ...contenu, [r]: e.target.value })} />
        </label>
      ))}
      <label className="flex flex-col gap-1 text-sm">
        Claims d’appui (identifiant@version, séparés par des espaces ou des retours à la ligne)
        <textarea className={CHAMP} rows={2} value={appuis} onChange={e => setAppuis(e.target.value)} />
      </label>
      <div>
        <Button type="button" disabled={envoi} onClick={() => void envoyer()}>
          Verser la version
        </Button>
      </div>
    </section>
  );
}

function CartePosition({
  position,
  peutDecider,
  envoi,
  soumettre,
}: {
  position: PositionLue;
  peutDecider: boolean;
  envoi: boolean;
  soumettre: Soumettre;
}) {
  const v = position.courante;
  const [relu, setRelu] = useState(false);
  const [motif, setMotif] = useState('');
  const signable = v.etat === 'brouillon' || v.etat === 'retiree';
  const retirable = v.etat === 'signee';

  const acte = async (quoi: 'signee' | 'retiree') => {
    const ok = await soumettre(
      'actes',
      {
        idVersion: v.id,
        acte: quoi,
        empreinteVue: v.empreinte,
        dernierActeVu: v.jeton,
        ...(quoi === 'signee' ? { relectureIntegrale: relu } : { motif }),
      },
      quoi === 'signee' ? `${position.positionId}@${v.version} signée.` : `${position.positionId}@${v.version} retirée.`,
    );
    if (ok) {
      setRelu(false);
      setMotif('');
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-label={`${position.positionId}@${v.version}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">
          {position.positionId}@{v.version}
        </span>
        <Badge variant={v.etat === 'signee' ? 'success' : v.etat === 'retiree' ? 'danger' : 'neutral'}>{LIBELLE_ETAT[v.etat]}</Badge>
        {position.enVigueur && <Badge variant="info">En vigueur</Badge>}
        {position.aRelire && <Badge variant="warning">À relire</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        {LIBELLES_DOSSIERS[v.dossier as DossierPosition] ?? v.dossier} · {v.ficheId ?? 'aucune fiche'} · versée le{' '}
        {formatDate(v.creeLe)} par {v.auteur}
      </p>
      {position.aRelire && (
        <p className="text-sm text-status-warning">Claims d’appui qui ne sont plus frais au corpus : {v.appuisNonFrais.join(', ')}.</p>
      )}
      {v.contenu ? (
        <dl className="flex flex-col gap-2 text-sm">
          {RUBRIQUES_POSITION.map(r => (
            <div key={r}>
              <dt className="font-medium text-foreground">{LIBELLES_RUBRIQUES[r]}</dt>
              <dd className="whitespace-pre-wrap text-foreground">{v.contenu?.[r]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-status-danger">Contenu illisible : aucun acte ne peut s’y poser.</p>
      )}
      <p className="text-sm text-muted-foreground">Claims d’appui : {v.claimsAppui.join(', ')}</p>

      {peutDecider && v.contenu && v.empreinte && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {signable && (
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={relu} onChange={e => setRelu(e.target.checked)} className="mt-1" />
                J’ai relu l’intégralité de cette version : énoncé, périmètre, population, limites et claims d’appui.
              </label>
              <div>
                <Button type="button" disabled={envoi || !relu} onClick={() => void acte('signee')}>
                  Signer cette version
                </Button>
              </div>
            </div>
          )}
          {retirable && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Motif du retrait
                <textarea className={CHAMP} rows={2} value={motif} onChange={e => setMotif(e.target.value)} />
              </label>
              <div>
                <Button type="button" variant="danger" disabled={envoi || motif.trim() === ''} onClick={() => void acte('retiree')}>
                  Retirer cette version
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Historique ({position.versions.length} version(s))</summary>
        <ul className="mt-2 flex flex-col gap-2">
          {position.versions.map(ver => (
            <li key={ver.id}>
              <span className="font-medium">{ver.version}</span> — {LIBELLE_ETAT[ver.etat]}
              {ver.courante ? ' (courante)' : ''}, versée le {formatDate(ver.creeLe)}
              {ver.actes.length > 0 && (
                <ul className="ml-4 list-disc">
                  {ver.actes.map(a => (
                    <li key={a.ordre}>
                      {a.acte === 'signee' ? 'Signée' : 'Retirée'} le {formatDate(a.le)} par {a.auteur}
                      {a.motif ? ` — motif : ${a.motif}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function SectionArbitrages({
  atelier,
  peutDecider,
  envoi,
  soumettre,
}: {
  atelier: AtelierPositions;
  peutDecider: boolean;
  envoi: boolean;
  soumettre: Soumettre;
}) {
  const couple = (conflitId: string, ficheId: string) =>
    atelier.couples.find(c => c.conflitId === conflitId && c.ficheId === ficheId) ?? null;
  const couverts = new Set(atelier.conflits.flatMap(c => c.fichesCurees.map(f => `${c.id}|${f}`)));
  const autres = atelier.couples.filter(c => !couverts.has(`${c.conflitId}|${c.ficheId}`));

  return (
    <section aria-labelledby="titre-arbitrages" className="flex flex-col gap-4">
      <h3 id="titre-arbitrages" className="font-display text-lg font-semibold text-foreground">
        Arbitrages des conflits de sources
      </h3>
      <p className="text-sm text-muted-foreground">
        Un arbitrage vaut pour sa fiche seule, jamais pour le claim en général. Le conflit reste affiché avec ses
        deux claims ; tant qu’un couple n’est pas arbitré, l’escalade au praticien reste seule.
      </p>
      {atelier.conflits.length === 0 && <p className="text-sm text-muted-foreground">Aucun conflit publié au registre.</p>}
      {atelier.conflits.map(c => (
        <article key={c.id} className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-label={c.id}>
          <p className="font-semibold text-foreground">{c.id}</p>
          <p className="text-sm text-foreground">{c.objet}</p>
          <p className="text-sm text-muted-foreground">Claims du conflit : {c.claims.join(' · ')}</p>
          {c.fichesCurees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Le registre ne porte pas encore la liste curée des fiches de ce conflit : aucun arbitrage n’est possible
              avant sa re-signature.
            </p>
          ) : (
            c.fichesCurees.map(f => (
              <CoupleArbitrage
                key={f}
                conflitId={c.id}
                ficheId={f}
                claims={c.claims}
                couple={couple(c.id, f)}
                positions={atelier.positions.filter(p => p.enVigueur && !p.aRelire && p.courante.ficheId === f)}
                peutDecider={peutDecider}
                envoi={envoi}
                soumettre={soumettre}
              />
            ))
          )}
        </article>
      ))}
      {autres.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-foreground">Arbitrages enregistrés hors des listes curées du jour</h4>
          {autres.map(k => (
            <CoupleArbitrage
              key={`${k.conflitId}|${k.ficheId}`}
              conflitId={k.conflitId}
              ficheId={k.ficheId}
              claims={null}
              couple={k}
              positions={[]}
              peutDecider={peutDecider}
              envoi={envoi}
              soumettre={soumettre}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CoupleArbitrage({
  conflitId,
  ficheId,
  claims,
  couple,
  positions,
  peutDecider,
  envoi,
  soumettre,
}: {
  conflitId: string;
  ficheId: string;
  /** `null` : le couple n'est plus dans une liste curée — il ne se pose plus, il se révoque. */
  claims: [string, string] | null;
  couple: CoupleLu | null;
  positions: PositionLue[];
  peutDecider: boolean;
  envoi: boolean;
  soumettre: Soumettre;
}) {
  // Aucune option cochée d'avance (D-439 §3).
  const [retenu, setRetenu] = useState<string>('');
  const [motif, setMotif] = useState('');
  const tete = couple?.tete ?? null;
  const aRelire = (couple?.causesARelire.length ?? 0) > 0;

  const poser = async () => {
    const [type, valeur] = retenu.split('|', 2);
    const ok = await soumettre(
      'arbitrages',
      {
        acte: 'pose',
        conflitId,
        ficheId,
        teteVue: tete?.id ?? null,
        motif,
        ...(type === 'claim' ? { claimRetenu: valeur } : { idPositionVersion: valeur }),
      },
      `Arbitrage posé pour ${conflitId} × ${ficheId}.`,
    );
    if (ok) {
      setRetenu('');
      setMotif('');
    }
  };
  const revoquer = async () => {
    if (!tete) return;
    const ok = await soumettre(
      'arbitrages',
      { acte: 'revocation', conflitId, ficheId, teteVue: tete.id, motif },
      `Arbitrage révoqué pour ${conflitId} × ${ficheId} : le couple n’est plus arbitré.`,
    );
    if (ok) setMotif('');
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3" aria-label={`${conflitId} × ${ficheId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {conflitId} × {ficheId}
        </span>
        {!tete && <Badge variant="neutral">Non arbitré</Badge>}
        {tete && !aRelire && <Badge variant="info">Arbitré</Badge>}
        {tete && aRelire && <Badge variant="warning">À relire</Badge>}
      </div>
      {tete && (
        <div className="text-sm text-foreground">
          <p>
            Retenu : {tete.claimRetenu ?? tete.positionRetenue} — le {formatDate(tete.le)} par {tete.auteur}
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">Motif : {tete.motif}</p>
          {aRelire && (
            <ul className="ml-4 list-disc text-status-warning">
              {couple?.causesARelire.map(c => <li key={c}>{LIBELLES_CAUSES[c]}</li>)}
            </ul>
          )}
        </div>
      )}
      {peutDecider && (
        <div className="flex flex-col gap-2">
          {claims && (
            <fieldset className="flex flex-col gap-1 text-sm">
              <legend className="font-medium">Position retenue{tete ? ' (remplace l’arbitrage en vigueur)' : ''}</legend>
              {claims.map(cl => (
                <label key={cl} className="flex items-center gap-2">
                  <input type="radio" name={`retenu-${conflitId}-${ficheId}`} checked={retenu === `claim|${cl}`} onChange={() => setRetenu(`claim|${cl}`)} />
                  Claim {cl}
                </label>
              ))}
              {positions.map(p => (
                <label key={p.courante.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`retenu-${conflitId}-${ficheId}`}
                    checked={retenu === `position|${p.courante.id}`}
                    onChange={() => setRetenu(`position|${p.courante.id}`)}
                  />
                  {LIBELLE_POSITION} : {p.positionId}@{p.courante.version}
                </label>
              ))}
            </fieldset>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Motif
            <textarea className={CHAMP} rows={2} value={motif} onChange={e => setMotif(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {claims && (
              <Button type="button" disabled={envoi || retenu === '' || motif.trim() === ''} onClick={() => void poser()}>
                Poser l’arbitrage
              </Button>
            )}
            {tete && (
              <Button type="button" variant="danger" disabled={envoi || motif.trim() === ''} onClick={() => void revoquer()}>
                Révoquer l’arbitrage
              </Button>
            )}
          </div>
        </div>
      )}
      {couple && couple.historique.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Historique du couple ({couple.historique.length})</summary>
          <ul className="mt-2 ml-4 list-disc">
            {couple.historique.map(a => (
              <li key={a.id}>
                {a.acte === 'pose' ? `Pose : ${a.claimRetenu ?? a.positionRetenue}` : 'Révocation'} — le {formatDate(a.le)} par{' '}
                {a.auteur} — motif : {a.motif}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
