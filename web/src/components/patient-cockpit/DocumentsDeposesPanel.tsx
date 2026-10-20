'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentsDeposesResponse, GesteDocumentDeposeResponse } from '@/app/api/praticien/documents-deposes/route';
import type { DocumentDeposeLu } from '@/lib/collecte/documentsDeposesServeur';
import {
  CATEGORIES_DOCUMENT,
  LIBELLES_CATEGORIE_DOCUMENT,
  LIBELLES_MOTIF_RETRAIT,
  libelleCategorie,
  MOTIFS_RETRAIT_DOCUMENT,
  type CategorieDocument,
  type MotifRetraitDocument,
} from '@/lib/collecte/documentsDeposes';

/*
 * « DOCUMENTS DÉPOSÉS PAR LE PATIENT » ([[D-330]], J3-collecte).
 *
 * Chaque document, le plus récent en haut : sa catégorie courante (la
 * proposition du patient, ou la dernière correction), le jour du dépôt, celui de
 * la première ouverture, et les trois gestes du praticien du dossier :
 *  — OUVRIR : le document dans un nouvel onglet ; la première ouverture se
 *    trace côté serveur, une seule fois ;
 *  — CORRIGER la catégorie : chaque correction est datée et reste lisible ;
 *  — RETIRER (déposé par erreur, ou demande de droit) : le contenu est effacé,
 *    la ligne reste. Geste définitif, confirmé.
 *
 * Aucun nom de fichier (il n'est pas gardé). Drapeau du dépôt fermé et aucun
 * document : l'encart ne s'affiche pas.
 */

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'charge'; ouvert: boolean; documents: DocumentDeposeLu[] };

const JOUR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' });

function jour(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : JOUR.format(date);
}

function libelleMotif(motif: string | null): string {
  return motif && motif in LIBELLES_MOTIF_RETRAIT ? LIBELLES_MOTIF_RETRAIT[motif as MotifRetraitDocument] : '';
}

const bouton =
  'min-h-9 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50';

function LigneDocument({
  idPatient,
  document,
  onChange,
}: {
  idPatient: string;
  document: DocumentDeposeLu;
  onChange: () => Promise<void>;
}) {
  const [categorie, setCategorie] = useState<CategorieDocument>(
    (CATEGORIES_DOCUMENT as readonly string[]).includes(document.categorieCourante)
      ? (document.categorieCourante as CategorieDocument)
      : 'autre',
  );
  const [motif, setMotif] = useState<MotifRetraitDocument | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const retire = document.retireLe !== null;
  const lien = `/api/praticien/documents-deposes/contenu?idPatient=${encodeURIComponent(idPatient)}&idDocument=${encodeURIComponent(document.id)}`;

  async function geste(corps: Record<string, string>) {
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch('/api/praticien/documents-deposes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idDocument: document.id, ...corps }),
      });
      const data = (await res.json().catch(() => null)) as GesteDocumentDeposeResponse | null;
      if (!res.ok || !data?.ok) setErreur(data && !data.ok ? data.error : 'Le geste n’a pas pu être enregistré.');
      await onChange();
    } catch {
      setErreur('Connexion interrompue. Réessayez.');
    } finally {
      setOccupe(false);
      setConfirmer(false);
    }
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-foreground">{libelleCategorie(document.categorieCourante)}</span>
        <span className="text-sm text-muted-foreground">Déposé le {jour(document.deposeLe)}</span>
        {document.consulteLe && <span className="text-sm text-muted-foreground">Ouvert le {jour(document.consulteLe)}</span>}
        {retire && document.retireLe && (
          <span className="text-sm text-foreground">
            Retiré le {jour(document.retireLe)} — {libelleMotif(document.motifRetrait)}
          </span>
        )}
      </div>

      {(document.classements.length > 0 || document.categorieCourante !== document.categorieProposee) && (
        <ul className="text-xs text-muted-foreground">
          <li>Proposée par le patient : {libelleCategorie(document.categorieProposee)}</li>
          {document.classements.map((c, i) => (
            <li key={`${c.classeLe}-${i}`}>
              Corrigée le {jour(c.classeLe)} : {libelleCategorie(c.categorie)}
            </li>
          ))}
        </ul>
      )}

      {erreur && (
        <p role="alert" className="text-sm text-status-danger">
          {erreur}
        </p>
      )}

      {!retire && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // La première ouverture se trace côté serveur ; on relit la ligne ensuite.
              if (!document.consulteLe) window.setTimeout(() => void onChange(), 1500);
            }}
            className={bouton}
          >
            Ouvrir le document
          </a>

          <label className="flex items-center gap-2 text-xs text-foreground">
            Catégorie
            <select
              value={categorie}
              disabled={occupe}
              onChange={e => setCategorie(e.target.value as CategorieDocument)}
              className="min-h-9 rounded-lg border border-border bg-surface px-2 text-xs"
            >
              {CATEGORIES_DOCUMENT.map(c => (
                <option key={c} value={c}>
                  {LIBELLES_CATEGORIE_DOCUMENT[c]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={occupe || categorie === document.categorieCourante}
            onClick={() => void geste({ geste: 'classer', categorie })}
            className={bouton}
          >
            Corriger la catégorie
          </button>

          <fieldset className="flex flex-wrap items-center gap-2 text-xs text-foreground" disabled={occupe}>
            <legend className="sr-only">Motif du retrait</legend>
            {MOTIFS_RETRAIT_DOCUMENT.map(m => (
              <label key={m} className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`motif-${document.id}`}
                  value={m}
                  checked={motif === m}
                  onChange={() => {
                    setMotif(m);
                    setConfirmer(false);
                  }}
                />
                {LIBELLES_MOTIF_RETRAIT[m]}
              </label>
            ))}
          </fieldset>
          {!confirmer ? (
            <button type="button" disabled={occupe || !motif} onClick={() => setConfirmer(true)} className={bouton}>
              Retirer le document
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-xs text-foreground">
              Le document sera effacé ; la ligne restera, datée.
              <button
                type="button"
                disabled={occupe || !motif}
                onClick={() => motif && void geste({ geste: 'retirer', motif })}
                className={bouton}
              >
                Confirmer le retrait
              </button>
              <button type="button" disabled={occupe} onClick={() => setConfirmer(false)} className={bouton}>
                Annuler
              </button>
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export function DocumentsDeposesPanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  // Plusieurs relectures peuvent se croiser (minuteur de l'ouverture, retrait) :
  // seule la réponse de la DERNIÈRE est retenue, jamais une réponse périmée.
  const generation = useRef(0);

  const charger = useCallback(async () => {
    const mienne = ++generation.current;
    try {
      const res = await fetch(`/api/praticien/documents-deposes?idPatient=${encodeURIComponent(idPatient)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as DocumentsDeposesResponse;
      if (mienne !== generation.current) return;
      setEtat(res.ok && data.ok ? { statut: 'charge', ouvert: data.ouvert, documents: data.documents } : { statut: 'erreur' });
    } catch {
      if (mienne !== generation.current) return;
      setEtat({ statut: 'erreur' });
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Surface patient fermée et rien de déposé : l'encart n'a rien à dire.
  if (etat.statut === 'chargement') return null;
  if (etat.statut === 'charge' && !etat.ouvert && etat.documents.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-base font-semibold text-foreground">Documents déposés par le patient</h3>

      {/* Une lecture en échec ne se rend jamais comme une liste vide. */}
      {etat.statut === 'erreur' && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Les documents déposés n’ont pas pu être lus.</span>
          <button type="button" onClick={() => void charger()} className={bouton}>
            Réessayer la lecture des documents déposés
          </button>
        </div>
      )}

      {etat.statut === 'charge' && etat.documents.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Aucun document déposé par ce patient.</p>
      )}

      {etat.statut === 'charge' && etat.documents.length > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {etat.documents.map(d => (
            <LigneDocument key={d.id} idPatient={idPatient} document={d} onChange={charger} />
          ))}
        </ul>
      )}
    </section>
  );
}
