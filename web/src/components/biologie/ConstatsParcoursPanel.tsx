'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBioConstatEnabled } from '@/components/patient-cockpit/CbFeatureProvider';
import {
  AVERTISSEMENT_FILET,
  AVERTISSEMENT_NOTE,
  LIBELLES_A_RELIRE,
  LIBELLES_MOTIF,
  LIBELLES_VERDICT,
  MOTIFS_PAR_VERDICT,
  NATURE_DATE_A_REVOIR,
  NOTE_MAX,
  PIECES_MAX,
  VERDICTS,
  VERDICTS_A_PIECE,
  estVerdict,
  type RaisonARelire,
  type Verdict,
} from '@/lib/bio-parcours/constats/liste';
import { LIBELLES_NATURE } from '@/lib/physio-traitements/liste';

// LES CONSTATS DU PRATICIEN SUR LES HYPOTHÈSES DU PARCOURS ([[D-331]], BP-11) :
// l'écran du praticien seul, sous `WN_BIO_CONSTAT` (éteint par défaut). Un
// constat est un geste daté sur une HYPOTHÈSE, appuyé sur des pièces citées
// par leur clé ; il ne dit jamais ce que vaut une valeur, et l'écran n'en
// affiche aucune — une pièce se dit par son analyse et sa date. « À relire »
// est dérivé par la lecture, jamais écrit : l'écran dit quelle condition tient.

type PieceDecrite =
  | { type: 'resultat'; id: string; analyteCode: string; analyteLibelle: string | null; preleveLe: string }
  | { type: 'reponse'; id: string; titre: string; dateReponse: string }
  | { type: 'traitement'; id: string; nature: string | null; nom: string | null; acteLe: string };

type ActeDecrit = {
  id: string;
  acte: 'pose' | 'retrait';
  hypotheseCode: string;
  verdict: string | null;
  motif: string | null;
  note: string | null;
  aRevoirLe: string | null;
  praticienEmail: string;
  acteLe: string;
  pieces: PieceDecrite[];
};

type HypotheseLue = {
  hypotheseCode: string;
  tete: ActeDecrit | null;
  aRelire: RaisonARelire[];
  historique: ActeDecrit[];
};

type Donnees = {
  structureSignee: boolean;
  offertes: { hypotheseCode: string; libelle: string | null }[];
  aujourdhui: string;
  hypotheses: HypotheseLue[];
  citables: PieceDecrite[];
};

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

const jourCivil = (aaaammjj: string) => {
  const [a, m, j] = aaaammjj.split('-');
  return `${j}/${m}/${a}`;
};

function decrirePiece(p: PieceDecrite): string {
  if (p.type === 'resultat') return `${p.analyteLibelle ?? p.analyteCode} — prélevé le ${jour(p.preleveLe)}`;
  if (p.type === 'reponse') return `${p.titre} — passé le ${jour(p.dateReponse)}`;
  // Une ligne de traitement ([[D-335]] §7) : sa nature, son nom, la date de la ligne citée.
  const nature = p.nature === 'medicament' || p.nature === 'complement' ? LIBELLES_NATURE[p.nature] : 'Traitement';
  return `${nature} : ${p.nom ?? ''} — ligne du ${jour(p.acteLe)}`;
}

const libelleVerdict = (v: string | null) => (v !== null && estVerdict(v) ? LIBELLES_VERDICT[v] : v ?? '');

function lendemain(aaaammjj: string): string {
  const d = new Date(`${aaaammjj}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type Geste = { hypotheseCode: string; acte: 'pose' | 'retrait'; remplace: string | null };

/**
 * Les refus nés d'une lecture périmée — la tête, une pièce ou la structure ont
 * changé depuis le GET : le panneau ferme le formulaire et relit le parcours,
 * pour que les pièces offertes soient celles qui font foi (revue CodeRabbit
 * de #1603).
 */
const REFUS_PERIMES = new Set([
  'tete_changee',
  'conflit_concurrent',
  'refus_base',
  'piece_inconnue',
  'piece_corrigee',
  'piece_annulee',
  'passation_exclue',
  'traitement_remplace',
  'structure_non_signee',
  'hypothese_hors_structure',
]);

function FormulairePose({
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
  const pieceRequise = verdict !== null && VERDICTS_A_PIECE.includes(verdict);
  const pret = verdict !== null
    && (motifs.length === 0 || motif !== null)
    && (motif !== 'autre' || note.trim().length > 0)
    && (!pieceRequise || pieces.size > 0);

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
      const res = await fetch('/api/praticien/biologie/constats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, ...corps }),
      });
      const rendu = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string; error?: string } | null;
      if (res.status === 409 && rendu?.reason && REFUS_PERIMES.has(rendu.reason)) {
        onPerime(rendu.error ?? 'Le parcours a changé depuis votre lecture.');
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
          Le constat en vigueur est retiré : l’hypothèse revient à « aucun constat posé ». Le retrait est daté et
          reste à l’historique, avec le constat qu’il retire.
        </p>
        {erreur && <p role="alert" className="mt-2 text-xs text-destructive">{erreur}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={envoi}
            onClick={() => void envoyer({ acte: 'retrait', hypothese: geste.hypotheseCode, remplace: geste.remplace })}
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
              name={`verdict-${geste.hypotheseCode}`}
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
                name={`motif-${geste.hypotheseCode}`}
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
        <legend className="text-xs text-muted-foreground">
          {pieceRequise ? 'Pièces (au moins une)' : 'Pièces (facultatives)'}
        </legend>
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
              hypothese: geste.hypotheseCode,
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

export function ConstatsParcoursPanel({ idPatient }: { idPatient: string }) {
  const ouvert = useBioConstatEnabled();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [geste, setGeste] = useState<Geste | null>(null);
  // Le refus d'un geste périmé, gardé au-dessus de la relecture qui suit.
  const [avis, setAvis] = useState<string | null>(null);

  // Chaque lecture est numérotée : seule la dernière s'applique, pour qu'une
  // réponse plus ancienne n'écrase pas une relecture plus récente (revue
  // CodeRabbit de #1603).
  const sequence = useRef(0);
  const charger = useCallback(async () => {
    const numero = ++sequence.current;
    setErreur(null);
    try {
      const res = await fetch(`/api/praticien/biologie/constats?idPatient=${encodeURIComponent(idPatient)}`);
      const rendu = (await res.json().catch(() => null)) as ({ ok: true } & Donnees) | { ok: false; error?: string } | null;
      if (numero !== sequence.current) return;
      if (!res.ok || !rendu || !rendu.ok) {
        setErreur((rendu && !rendu.ok && rendu.error) || 'Les constats n’ont pas pu être lus.');
        return;
      }
      setDonnees(rendu);
    } catch {
      if (numero === sequence.current) setErreur('Les constats n’ont pas pu être lus.');
    }
  }, [idPatient]);

  useEffect(() => {
    if (ouvert) void charger();
  }, [ouvert, charger]);

  if (!ouvert) return null;

  const lues = new Map((donnees?.hypotheses ?? []).map(h => [h.hypotheseCode, h]));
  const codes = [
    ...(donnees?.offertes ?? []).map(o => o.hypotheseCode),
    ...(donnees?.hypotheses ?? []).map(h => h.hypotheseCode).filter(c => !(donnees?.offertes ?? []).some(o => o.hypotheseCode === c)),
  ];
  const libelle = (code: string) => donnees?.offertes.find(o => o.hypotheseCode === code)?.libelle ?? code;

  return (
    <section aria-labelledby="constats-parcours-titre" className="mt-6 rounded-xl border border-border p-4">
      <h3 id="constats-parcours-titre" className="text-base font-semibold text-foreground">Constats du parcours</h3>
      <p className="mt-1 text-xs text-muted-foreground">{AVERTISSEMENT_FILET}</p>
      {erreur && <p role="alert" className="mt-2 text-sm text-destructive">{erreur}</p>}
      {avis && <p role="alert" className="mt-2 text-sm text-destructive">{avis}</p>}
      {donnees && !donnees.structureSignee && (
        <p className="mt-2 text-sm text-muted-foreground">
          La structure des fiches d’usage n’est pas encore signée : aucun constat ne se pose.
        </p>
      )}
      {donnees && codes.length > 0 && (
        <ul className="mt-3 space-y-4">
          {codes.map(code => {
            const lue = lues.get(code);
            const tete = lue?.tete ?? null;
            const offerte = donnees.offertes.some(o => o.hypotheseCode === code);
            return (
              <li key={code} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{libelle(code)}</p>
                {tete ? <Acte acte={tete} /> : <p className="text-xs text-muted-foreground">Aucun constat posé.</p>}
                {lue && lue.aRelire.length > 0 && (
                  <div className="mt-2 rounded-md border border-border bg-muted/40 p-2">
                    <p className="text-xs font-medium text-foreground">À relire</p>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {lue.aRelire.map(r => (
                        <li key={r}>{LIBELLES_A_RELIRE[r]}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {offerte && donnees.structureSignee && (
                    <button
                      type="button"
                      onClick={() => setGeste({ hypotheseCode: code, acte: 'pose', remplace: tete?.id ?? null })}
                      className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                    >
                      {tete ? 'Remplacer le constat' : 'Poser un constat'}
                    </button>
                  )}
                  {tete && (
                    <button
                      type="button"
                      onClick={() => setGeste({ hypotheseCode: code, acte: 'retrait', remplace: tete.id })}
                      className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                    >
                      Retirer le constat
                    </button>
                  )}
                </div>
                {geste && geste.hypotheseCode === code && (
                  <FormulairePose
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
                      setAvis(`${message} Le parcours a été relu.`);
                      void charger();
                    }}
                    onFermer={() => setGeste(null)}
                  />
                )}
                {lue && lue.historique.length > 1 && (
                  <details className="mt-2">
                    <summary className="min-h-11 cursor-pointer text-xs text-muted-foreground">Historique</summary>
                    <ol className="mt-1 space-y-2">
                      {lue.historique.map(a => (
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
