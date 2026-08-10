'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  FileEnvoiApiResponse,
  FileEnvoiBrouillon,
} from '@/app/api/praticien/file-envoi/route';
import type { EnvoyerFileResponse } from '@/app/api/praticien/file-envoi/envoyer/route';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/** Panneau « File d'envoi » de l'aside (demande propriétaire 2026-08-09) :
 * la file de la Bibliothèque devient visible ET validable depuis l'accueil —
 * le clic « Envoyer » EST la validation (doctrine D-030 inchangée : rien ne
 * part sans elle, elle change seulement d'écran). La composition de la file
 * (retrait d'un item, date limite, notes) reste dans la Bibliothèque, liée en
 * pied de panneau — l'aside envoie, elle n'édite pas. */
export function FileEnvoiAside() {
  const [etat, setEtat] = useState<'chargement' | 'chargee' | 'indisponible'>('chargement');
  const [brouillons, setBrouillons] = useState<FileEnvoiBrouillon[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [issue, setIssue] = useState<{ succes: boolean; message: string } | null>(null);

  const chargerFile = useCallback(async () => {
    try {
      const res = await fetch('/api/praticien/file-envoi');
      const json = (await res.json()) as FileEnvoiApiResponse;
      // Une file illisible n'est PAS une file vide : sur 401 comme sur 500 la
      // route rend `{brouillons: [], unavailable: true}`, et l'afficher vide
      // ferait croire qu'il n'y a rien à valider. On le dit — ou, si une
      // lecture antérieure a réussi, on garde ce qu'on savait.
      if (!res.ok || json?.unavailable) {
        setEtat(prev => (prev === 'chargee' ? 'chargee' : 'indisponible'));
        return;
      }
      setBrouillons(Array.isArray(json?.brouillons) ? json.brouillons : []);
      setEtat('chargee');
    } catch {
      setEtat(prev => (prev === 'chargee' ? 'chargee' : 'indisponible'));
    }
  }, []);

  useEffect(() => {
    void chargerFile();
  }, [chargerFile]);

  const envoyer = useCallback(
    async (brouillon: FileEnvoiBrouillon) => {
      setEnvoiEnCours(brouillon.idBrouillon);
      setIssue(null);
      const patient = `${brouillon.prenom} ${brouillon.nom}`.trim();
      try {
        const res = await fetch('/api/praticien/file-envoi/envoyer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idBrouillon: brouillon.idBrouillon }),
        });
        const json = (await res.json()) as EnvoyerFileResponse;
        if (json?.success) {
          const nb = json.count ?? brouillon.items.length;
          setIssue({
            succes: true,
            message: `${patient} : ${nb} questionnaire${nb > 1 ? 's' : ''} envoyé${nb > 1 ? 's' : ''} — un seul mail.`,
          });
        } else {
          // Le texte du refus vient de la route quand elle en donne un
          // (« Dossier clos. », « Accès portail révoqué… ») — le réécrire ici
          // ferait diverger deux formulations du même refus.
          setIssue({
            succes: false,
            message: json?.error ? `Envoi impossible : ${json.error}` : `Envoi impossible pour ${patient}.`,
          });
        }
      } catch {
        setIssue({ succes: false, message: `Envoi impossible pour ${patient}.` });
      } finally {
        setEnvoiEnCours(null);
        await chargerFile();
      }
    },
    [chargerFile],
  );

  return (
    <section
      data-testid="file-envoi-aside"
      aria-label="File d’envoi des questionnaires"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">File d&apos;envoi</h3>
        <Badge variant="info">1 mail par patient</Badge>
      </div>

      {etat === 'chargement' ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : etat === 'indisponible' ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La file d&apos;envoi est momentanément indisponible. Rechargez la page.
        </p>
      ) : brouillons.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La file est vide — ajoutez des questionnaires depuis la Bibliothèque ou depuis les
          recommandations d&apos;un patient.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {brouillons.map(b => (
            <li key={b.idBrouillon} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/patients/${b.idPatient}`}
                  className="min-w-0 truncate text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {b.prenom} {b.nom}
                </Link>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {b.items.length} élément{b.items.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {b.items.map(item => (
                  <li key={item.id} className="text-xs text-foreground">
                    {item.titre}
                    {item.indisponible && (
                      <span className="ml-1.5 inline-flex">
                        <Badge variant="danger">Indisponible</Badge>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                disabled={envoiEnCours !== null}
                onClick={() => envoyer(b)}
              >
                {envoiEnCours === b.idBrouillon
                  ? 'Envoi...'
                  : `Envoyer (${b.items.length}) — un seul mail`}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {issue && (
        <p
          role="status"
          className={`mt-2 text-xs ${issue.succes ? 'text-status-success' : 'text-status-danger'}`}
        >
          {issue.message}
        </p>
      )}

      <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        Rien ne part sans votre validation.{' '}
        <Link href="/dashboard/bibliotheque" className="hover:text-foreground hover:underline">
          Gérer la file dans la Bibliothèque
        </Link>
      </p>
    </section>
  );
}
