'use client';

import { useState } from 'react';
import type { ImportLu } from '@/lib/biology-library/import/lecture';
import type { ActeLectureLu } from '@/lib/biology-library/import/acteLecture';
import {
  CODES_REVOCATION,
  LIBELLES_CODE_REVOCATION,
  MENTION_PAS_UN_FILET,
  estCodeRevocation,
  etatLecture,
  type CodeRevocation,
} from '@/lib/biology-library/import/lectureImport';

// L'ACTE DE LECTURE CLINIQUE d'un import validé ([[D-268]], BIO-PARCOURS
// BP-10), derrière `WN_BIO_LECTURE_ENABLED`. C'est ICI qu'il se pose : la
// carte du Fil y mène, on ne lit pas depuis la carte (précision du
// 2026-10-06).
//
// CE QUI EST LU, C'EST LA RESTITUTION, PAS LE DOCUMENT : la dernière décision
// d'un import purge son document ([[D-258]]), si bien qu'il n'existe plus
// quand la lecture devient possible. L'écran le dit.
//
// L'ACTE NE BLOQUE RIEN (§3) et l'écran dit ce qu'il n'est pas (§9). Une
// révocation porte un code de la liste fermée, jamais un texte libre (§5).

const BOUTON = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const BOUTON_PRIMAIRE =
  'min-h-11 rounded-lg border border-transparent bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const CHAMP = 'min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

const FORMAT_PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatInstant(iso: string): string {
  return FORMAT_PARIS.format(new Date(iso));
}

function libelleCode(code: string | null): string {
  return estCodeRevocation(code) ? LIBELLES_CODE_REVOCATION[code] : 'motif non reconnu';
}

export function LectureImportBiologique({
  idPatient,
  imp,
  actes,
  onActe,
}: {
  idPatient: string;
  imp: ImportLu;
  actes: ActeLectureLu[];
  /** Relit le compte rendu et ses actes après un acte posé. */
  onActe: () => Promise<void>;
}) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revocationArmee, setRevocationArmee] = useState(false);
  const [code, setCode] = useState<CodeRevocation>(CODES_REVOCATION[0]);

  const nbValidees = imp.lignes.filter(l => l.statut === 'validee').length;
  const nbProposees = imp.lignes.filter(l => l.statut === 'proposee').length;
  if (nbValidees === 0) return null;

  // `actes` arrive dans l'ordre canonique de la base (`lireActesLecture`) :
  // son rang EST l'ordre.
  const etat = etatLecture(actes.map((a, rang) => ({ ...a, ordre: rang, acteLe: new Date(a.acteLe) })));
  const revocationDe = new Map(
    actes.filter(a => a.acte === 'revocation' && a.idLectureRevoquee).map(a => [a.idLectureRevoquee as string, a]),
  );
  const lecturesRevoquees = actes.filter(a => a.acte === 'lecture' && revocationDe.has(a.id));

  async function poser(corps: Record<string, unknown>) {
    setOccupe(true);
    setErreur(null);
    try {
      const response = await fetch('/api/praticien/biologie/import/lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idImport: imp.id, ...corps }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        // Le message du serveur est affiché tel quel : il nomme la raison.
        setErreur(payload?.error ?? 'L’acte n’a pas pu être consigné.');
      } else {
        setRevocationArmee(false);
      }
      // Relire dans les deux cas : un refus de course dit que l'état a changé.
      await onActe();
    } catch {
      setErreur('L’acte n’a pas pu être consigné.');
    } finally {
      setOccupe(false);
    }
  }

  return (
    <section className="mt-3 rounded-lg border border-border p-3" aria-label="Lecture clinique du compte rendu">
      <h5 className="text-sm font-medium text-foreground">Lecture clinique du compte rendu</h5>
      <p className="mt-1 text-xs text-muted-foreground">
        Valider des lignes n’est pas lire le compte rendu. Consigner votre lecture dit que vous avez lu la restitution
        ci-dessus : lignes lues, intervalles et marquages tels qu’imprimés par le laboratoire, résultats validés. Le
        document lui-même n’est pas affiché : il est effacé après la dernière décision. La lecture ne bloque ni
        n’autorise aucun geste.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{MENTION_PAS_UN_FILET}</p>

      {nbProposees > 0 ? (
        <p role="status" className="mt-2 text-sm text-foreground">
          {nbProposees} ligne{nbProposees > 1 ? 's restent' : ' reste'} à décider : la lecture se consigne une fois
          toutes les lignes décidées.
        </p>
      ) : etat.active ? (
        <div className="mt-2">
          {/* `role="status"` : le bouton qui avait le focus disparaît, la
              confirmation doit s'annoncer (revue #1347). */}
          <p role="status" className="text-sm text-foreground">
            Lecture consignée le {formatInstant(etat.active.acteLe.toISOString())} par {etat.active.praticienEmail}.
          </p>
          {revocationArmee ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Motif de la révocation
                <select
                  value={code}
                  disabled={occupe}
                  onChange={e => {
                    if (estCodeRevocation(e.target.value)) setCode(e.target.value);
                  }}
                  className={CHAMP}
                >
                  {CODES_REVOCATION.map(c => (
                    <option key={c} value={c}>
                      {LIBELLES_CODE_REVOCATION[c]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={occupe}
                onClick={() => void poser({ acte: 'revocation', idLecture: etat.active?.id, code })}
                className={BOUTON}
              >
                Confirmer la révocation
              </button>
              <button type="button" disabled={occupe} onClick={() => setRevocationArmee(false)} className={BOUTON}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" disabled={occupe} onClick={() => setRevocationArmee(true)} className={`${BOUTON} mt-2`}>
              Révoquer cette lecture
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2">
          {etat.derniereRevocation && (
            <p role="status" className="text-sm text-foreground">
              Lecture révoquée le {formatInstant(etat.derniereRevocation.acteLe.toISOString())} (
              {libelleCode(etat.derniereRevocation.codeRevocation).toLowerCase()}) : aucune lecture n’est consignée.
            </p>
          )}
          <button type="button" disabled={occupe} onClick={() => void poser({ acte: 'lecture' })} className={`${BOUTON_PRIMAIRE} mt-2`}>
            Consigner ma lecture
          </button>
        </div>
      )}

      {lecturesRevoquees.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Lectures révoquées">
          {lecturesRevoquees.map(l => {
            const r = revocationDe.get(l.id);
            return (
              <li key={l.id}>
                Lecture du {formatInstant(l.acteLe)} par {l.praticienEmail}
                {r && ` — révoquée le ${formatInstant(r.acteLe)} par ${r.praticienEmail} (${libelleCode(r.codeRevocation).toLowerCase()})`}
              </li>
            );
          })}
        </ul>
      )}

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreur}
        </p>
      )}
    </section>
  );
}
