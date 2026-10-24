'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AVERTISSEMENT_MESURE,
  AVERTISSEMENT_NOTE,
  LIBELLES_A_RELIRE,
  LIBELLES_MOTIF,
  LIBELLES_VERDICT,
  MOTIFS_PAR_VERDICT,
  NATURE_DATE_A_REVOIR,
  NOTE_MAX,
  PIECES_MAX,
  VERDICTS,
  estVerdict,
  type RaisonARelire,
  type Verdict,
} from '@/lib/constats-besoin/liste';

// LE CONSTAT DU PRATICIEN SUR UN BESOIN SANS SCORE ([[D-347]], t40) : l'écran
// du praticien seul, sous l'onglet « Besoins », monté seulement si
// `WN_CONSTAT_BESOIN` est allumé (la page le lit au serveur). Un constat est
// la décision datée du praticien sur un besoin évalué en entretien ou sur
// pièces ([[D-347]] §1) — 2, 6, 7
// et 11, qui n'ont aucune source de score ; il ne dit jamais l'état du
// patient, et l'écran n'affiche aucune valeur — une pièce se dit par son
// analyse ou son questionnaire, et sa date. « À relire » est dérivé par la
// lecture, jamais écrit : l'écran dit quelle condition tient. Le tableau des
// besoins, au-dessus, n'est pas touché : le besoin y reste « non mesuré ».

type PieceDecrite =
  | { type: 'resultat'; id: string; analyteCode: string; analyteLibelle: string | null; preleveLe: string }
  | { type: 'reponse'; id: string; titre: string; dateReponse: string };

type ActeDecrit = {
  id: string;
  acte: 'pose' | 'retrait';
  besoin: number;
  verdict: string | null;
  motif: string | null;
  note: string | null;
  aRevoirLe: string | null;
  praticienEmail: string;
  acteLe: string;
  pieces: PieceDecrite[];
};

type BesoinLu = {
  besoin: number;
  tete: ActeDecrit | null;
  aRelire: RaisonARelire[];
  historique: ActeDecrit[];
};

type Donnees = {
  offerts: { besoin: number; libelle: string; avecScore: boolean }[];
  aujourdhui: string;
  besoins: BesoinLu[];
  citables: PieceDecrite[];
};

const ROUTE = '/api/praticien/besoins/constats';

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

const jourCivil = (aaaammjj: string) => {
  const [a, m, j] = aaaammjj.split('-');
  return `${j}/${m}/${a}`;
};

function decrirePiece(p: PieceDecrite): string {
  if (p.type === 'resultat') return `${p.analyteLibelle ?? p.analyteCode} — prélevé le ${jour(p.preleveLe)}`;
  return `${p.titre} — passé le ${jour(p.dateReponse)}`;
}

const libelleVerdict = (v: string | null) => (v !== null && estVerdict(v) ? LIBELLES_VERDICT[v] : v ?? '');

function lendemain(aaaammjj: string): string {
  const d = new Date(`${aaaammjj}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type Geste = { besoin: number; acte: 'pose' | 'retrait'; remplace: string | null };

/**
 * Les refus nés d'une lecture périmée — la tête, une pièce ou le besoin ont
 * changé depuis le GET : le panneau ferme le formulaire et relit, pour que les
 * pièces offertes soient celles qui font foi.
 */
const REFUS_PERIMES = new Set([
  'tete_changee',
  'conflit_concurrent',
  'refus_base',
  'piece_inconnue',
  'piece_corrigee',
  'piece_annulee',
  'passation_exclue',
  'besoin_avec_score',
]);

function FormulaireConstat({
  idPatient,
  geste,
  citables,
  aujourdhui,
  onFait,
  onPerime,
  onFermer,
}: {
  idPatient: string;
  geste: Geste;
  citables: PieceDecrite[];
  aujourdhui: string;
  onFait: () => void;
  onPerime: (message: string) => void;
  onFermer: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [motif, setMotif] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [aRevoirLe, setARevoirLe] = useState('');
  const [pieces, setPieces] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const motifs = verdict ? MOTIFS_PAR_VERDICT[verdict] : [];
  const pret = verdict !== null
    && (motifs.length === 0 || motif !== null)
    && (motif !== 'autre' || note.trim().length > 0);

  const basculer = (cle: string) => {
    setPieces(prev => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  };

  async function envoyer(corps: Record<string, unknown>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch(ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, ...corps }),
      });
      const rendu = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string; error?: string } | null;
      if (res.status === 409 && rendu?.reason && REFUS_PERIMES.has(rendu.reason)) {
        onPerime(rendu.error ?? 'Les constats ont changé depuis votre lecture.');
        return;
      }
      if (!res.ok || !rendu?.ok) {
        setErreur(rendu?.error ?? 'Le geste n’a pas été enregistré.');
        return;
      }
      onFait();
    } catch {
      setErreur('Le geste n’a pas été enregistré.');
    } finally {
      setEnvoi(false);
    }
  }

  if (geste.acte === 'retrait') {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Le constat en vigueur est retiré : le besoin revient à « aucun constat posé ». Le retrait est daté et reste
          à l’historique, avec le constat qu’il retire.
        </p>
        {erreur && <p role="alert" className="mt-2 text-xs text-destructive">{erreur}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={envoi}
            onClick={() => void envoyer({ acte: 'retrait', besoin: geste.besoin, remplace: geste.remplace })}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Retirer le constat
          </button>
          <button type="button" onClick={onFermer} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {geste.remplace && (
        <p className="text-xs text-muted-foreground">Ce constat remplace celui en vigueur, qui reste à l’historique.</p>
      )}
      <fieldset className="space-y-1 text-sm text-foreground" disabled={envoi}>
        <legend className="text-xs text-muted-foreground">Verdict</legend>
        {VERDICTS.map(v => (
          <label key={v} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name={`verdict-besoin-${geste.besoin}`}
              value={v}
              checked={verdict === v}
              onChange={() => {
                setVerdict(v);
                setMotif(null);
              }}
            />
            {LIBELLES_VERDICT[v]}
          </label>
        ))}
      </fieldset>
      {motifs.length > 0 && (
        <fieldset className="space-y-1 text-sm text-foreground" disabled={envoi}>
          <legend className="text-xs text-muted-foreground">Motif</legend>
          {motifs.map(m => (
            <label key={m} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={`motif-besoin-${geste.besoin}`}
                value={m}
                checked={motif === m}
                onChange={() => setMotif(m)}
              />
              {LIBELLES_MOTIF[m] ?? m}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="space-y-1 text-sm text-foreground" disabled={envoi}>
        <legend className="text-xs text-muted-foreground">Pièces (facultatives)</legend>
        {citables.length === 0 && <p className="text-xs text-muted-foreground">Aucune pièce citable dans ce dossier.</p>}
        {citables.map(p => {
          const cle = `${p.type}:${p.id}`;
          return (
            <label key={cle} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={pieces.has(cle)}
                disabled={!pieces.has(cle) && pieces.size >= PIECES_MAX}
                onChange={() => basculer(cle)}
              />
              {decrirePiece(p)}
            </label>
          );
        })}
      </fieldset>
      <label className="block text-sm text-foreground">
        <span className="text-xs text-muted-foreground">
          {motif === 'autre' ? 'Note (obligatoire avec « autre motif »)' : 'Note (facultative)'}
        </span>
        <textarea
          value={note}
          maxLength={NOTE_MAX}
          disabled={envoi}
          onChange={e => setNote(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm"
          rows={3}
        />
        <span className="text-xs text-muted-foreground">{AVERTISSEMENT_NOTE}</span>
      </label>
      <label className="block text-sm text-foreground">
        <span className="text-xs text-muted-foreground">{`À revoir le (facultatif, ${NATURE_DATE_A_REVOIR})`}</span>
        <input
          type="date"
          value={aRevoirLe}
          min={lendemain(aujourdhui)}
          disabled={envoi}
          onChange={e => setARevoirLe(e.target.value)}
          className="mt-1 block min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
        />
      </label>
      {erreur && <p role="alert" className="text-xs text-destructive">{erreur}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={envoi || !pret}
          onClick={() =>
            void envoyer({
              acte: 'pose',
              besoin: geste.besoin,
              remplace: geste.remplace,
              verdict,
              motif,
              note: note.trim().length > 0 ? note : null,
              aRevoirLe: aRevoirLe || null,
              pieces: [...pieces].map(cle => {
                const [type, id] = cle.split(':');
                return { type, id };
              }),
            })
          }
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Poser ce constat
        </button>
        <button type="button" onClick={onFermer} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
          Fermer
        </button>
      </div>
    </div>
  );
}

function Acte({ acte }: { acte: ActeDecrit }) {
  if (acte.acte === 'retrait') {
    return <p className="text-xs text-muted-foreground">{`Retiré le ${jour(acte.acteLe)} par ${acte.praticienEmail}`}</p>;
  }
  return (
    <div className="space-y-1 text-sm text-foreground">
      <p>
        <span className="font-medium">{libelleVerdict(acte.verdict)}</span>
        {acte.motif ? ` — ${LIBELLES_MOTIF[acte.motif] ?? acte.motif}` : ''}
      </p>
      {acte.note && <p className="whitespace-pre-line text-xs text-muted-foreground">{acte.note}</p>}
      {acte.aRevoirLe && (
        <p className="text-xs text-muted-foreground">{`À revoir le ${jourCivil(acte.aRevoirLe)} (${NATURE_DATE_A_REVOIR})`}</p>
      )}
      {acte.pieces.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {acte.pieces.map(p => (
            <li key={`${p.type}:${p.id}`}>{decrirePiece(p)}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{`Posé le ${jour(acte.acteLe)} par ${acte.praticienEmail}`}</p>
    </div>
  );
}

export function ConstatsBesoinPanel({ idPatient }: { idPatient: string }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [geste, setGeste] = useState<Geste | null>(null);
  // Le refus d'un geste périmé, gardé au-dessus de la relecture qui suit.
  const [avis, setAvis] = useState<string | null>(null);

  // Chaque lecture est numérotée : seule la dernière s'applique, pour qu'une
  // réponse plus ancienne n'écrase pas une relecture plus récente.
  const sequence = useRef(0);
  const charger = useCallback(async () => {
    const numero = ++sequence.current;
    setErreur(null);
    try {
      const res = await fetch(`${ROUTE}?idPatient=${encodeURIComponent(idPatient)}`);
      const rendu = (await res.json().catch(() => null)) as ({ ok: true } & Donnees) | { ok: false; error?: string } | null;
      if (numero !== sequence.current) return;
      if (!res.ok || !rendu || !rendu.ok) {
        setErreur((rendu && !rendu.ok && rendu.error) || 'Les constats sur les besoins n’ont pas pu être lus.');
        return;
      }
      setDonnees(rendu);
    } catch {
      if (numero === sequence.current) setErreur('Les constats sur les besoins n’ont pas pu être lus.');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const lus = new Map((donnees?.besoins ?? []).map(b => [b.besoin, b]));

  return (
    <section aria-labelledby="constats-besoin-titre" className="mt-6 rounded-xl border border-border p-4">
      <h3 id="constats-besoin-titre" className="text-base font-semibold text-foreground">Constats sur les besoins sans score</h3>
      <p className="mt-1 text-xs text-muted-foreground">{AVERTISSEMENT_MESURE}</p>
      {erreur && <p role="alert" className="mt-2 text-sm text-destructive">{erreur}</p>}
      {avis && <p role="alert" className="mt-2 text-sm text-destructive">{avis}</p>}
      {donnees && (
        <ul className="mt-3 space-y-4">
          {donnees.offerts.map(offert => {
            const lu = lus.get(offert.besoin);
            const tete = lu?.tete ?? null;
            return (
              <li key={offert.besoin} className="rounded-lg border border-border p-3">
                <p id={`constat-besoin-${offert.besoin}`} className="text-sm font-medium text-foreground">
                  {`B${offert.besoin} · ${offert.libelle}`}
                </p>
                {tete ? <Acte acte={tete} /> : <p className="text-xs text-muted-foreground">Aucun constat posé.</p>}
                {lu && lu.aRelire.length > 0 && (
                  <div className="mt-2 rounded-md border border-border bg-muted/40 p-2">
                    <p className="text-xs font-medium text-foreground">À relire</p>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {lu.aRelire.map(r => (
                        <li key={r}>{LIBELLES_A_RELIRE[r]}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!offert.avecScore && (
                    <button
                      type="button"
                      aria-describedby={`constat-besoin-${offert.besoin}`}
                      onClick={() => setGeste({ besoin: offert.besoin, acte: 'pose', remplace: tete?.id ?? null })}
                      className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                    >
                      {tete ? 'Remplacer le constat' : 'Poser un constat'}
                    </button>
                  )}
                  {tete && (
                    <button
                      type="button"
                      aria-describedby={`constat-besoin-${offert.besoin}`}
                      onClick={() => setGeste({ besoin: offert.besoin, acte: 'retrait', remplace: tete.id })}
                      className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                    >
                      Retirer le constat
                    </button>
                  )}
                </div>
                {geste && geste.besoin === offert.besoin && (
                  <FormulaireConstat
                    key={`${geste.acte}-${geste.remplace ?? ''}`}
                    idPatient={idPatient}
                    geste={geste}
                    citables={donnees.citables}
                    aujourdhui={donnees.aujourdhui}
                    onFait={() => {
                      setGeste(null);
                      setAvis(null);
                      void charger();
                    }}
                    onPerime={message => {
                      setGeste(null);
                      setAvis(`${message} Les constats ont été relus.`);
                      void charger();
                    }}
                    onFermer={() => setGeste(null)}
                  />
                )}
                {lu && lu.historique.length > 1 && (
                  <details className="mt-2">
                    <summary className="min-h-11 cursor-pointer text-xs text-muted-foreground">Historique</summary>
                    <ol className="mt-1 space-y-2">
                      {lu.historique.map(a => (
                        <li key={a.id}>
                          <Acte acte={a} />
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
