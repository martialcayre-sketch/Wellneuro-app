'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailComptesRendusResponse } from '@/app/api/portail/comptes-rendus/route';
import {
  EXPLICATIONS_STATUT_TRANSMISSION,
  LIBELLES_STATUT_TRANSMISSION,
  MESSAGES_TRANSMISSION,
} from '@/lib/biology-library/import/transmissionStatut';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

// Le patient transmet le compte rendu de ses analyses à son praticien
// ([[D-269]], BIO-INGEST LOT-04). La route garde l'accès, le drapeau, l'accusé,
// le dossier ouvert et les plafonds ; l'écran ne fait que dire ce qu'elle
// répond. 401 renvoie au portail, 403 et 503 sont définitifs, le reste se
// réessaie (patron de `CourrierMedecinLecture`).
//
// L'ACCUSÉ AVANT LE PREMIER ENVOI (§6) : « L'intelligence artificielle dans
// Wellneuro », version courante, est présentée ici ; « J'en ai pris
// connaissance » l'accuse par la route existante, qui résout elle-même version
// et hash. La route de dépôt le vérifie de son côté.
//
// LE PATIENT NE VOIT QUE DATE ET STATUT (§4) : jamais une valeur, un libellé lu
// ou un marquage, et jamais les documents déposés par son praticien.

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; donnees: Extract<PortailComptesRendusResponse, { ok: true }> };

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' });

export function TransmissionCompteRendu({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [fichier, setFichier] = useState<File | null>(null);
  const [cleFichier, setCleFichier] = useState(0);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/comptes-rendus', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailComptesRendusResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 503 });
        return;
      }
      setEtat({ statut: 'pret', donnees: data });
    } catch {
      if (annuleRef.current) return;
      setEtat({ statut: 'erreur', message: 'Connexion interrompue. Vérifiez votre connexion et réessayez.', definitif: false });
    }
  }, [token, router]);

  useEffect(() => {
    annuleRef.current = false;
    void charger();
    return () => {
      annuleRef.current = true;
    };
  }, [charger]);

  async function accuser() {
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch('/api/portail/trust/lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentKey: 'usage_ia', type: 'pris_connaissance' }),
      });
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      if (!res.ok) {
        setErreur('Votre lecture n’a pas pu être enregistrée. Réessayez.');
        return;
      }
      await charger();
    } catch {
      setErreur('Connexion interrompue. Vérifiez votre connexion et réessayez.');
    } finally {
      setOccupe(false);
    }
  }

  async function envoyer() {
    if (!fichier) return;
    setOccupe(true);
    setErreur(null);
    setInfo(null);
    try {
      const form = new FormData();
      form.append('fichier', fichier);
      const res = await fetch('/api/portail/comptes-rendus', { method: 'POST', body: form });
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setErreur(data?.error ?? 'Le document n’a pas pu être envoyé. Réessayez.');
      } else {
        setInfo('Votre compte rendu a été transmis à votre praticien.');
        setFichier(null);
        setCleFichier(c => c + 1);
      }
      await charger();
    } catch {
      setErreur('Connexion interrompue. Vérifiez votre connexion et réessayez.');
    } finally {
      setOccupe(false);
    }
  }

  if (etat.statut === 'chargement') {
    return (
      <PatientCard padding="sm">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PatientCard>
    );
  }

  if (etat.statut === 'erreur') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : () => void charger()} />
      </PatientCard>
    );
  }

  const { documents, accuseRequis, dossierOuvert, plafond } = etat.donnees;

  return (
    <div className="space-y-6">
      <PatientCard>
        <h1 className="text-2xl font-semibold text-foreground">Transmettre un compte rendu d’analyses</h1>
        <p className="mt-2 text-base text-foreground">
          Vous pouvez déposer ici le compte rendu de vos analyses biologiques, pour votre praticien. Rien n’en est
          relevé à l’envoi : votre praticien vérifie d’abord qu’il s’agit bien de votre compte rendu, puis décide d’en
          lancer la lecture.
        </p>

        {/* Le succès s'ANNONCE (LOT-11, relecture d'accessibilité) : une région
            `status` présente dès le premier rendu — un lecteur d'écran ne lit
            pas une région live insérée en même temps que son texte. L'erreur
            garde son `role="alert"` (`PatientInlineMessage`). */}
        <div role="status">
          {info && (
            <div className="mt-6">
              <PatientInlineMessage tone="success">{info}</PatientInlineMessage>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}

          {!dossierOuvert ? (
            <p className="text-base text-foreground">{MESSAGES_TRANSMISSION.dossier_cloture}</p>
          ) : accuseRequis ? (
            <section aria-labelledby="accuse-usage-ia" className="space-y-4">
              <h2 id="accuse-usage-ia" className="text-lg font-semibold text-foreground">
                Avant votre premier envoi
              </h2>
              <p className="text-base text-foreground">{MESSAGES_TRANSMISSION.accuse_requis}</p>
              <DocumentTrust document={getDocumentCourant('usage_ia')} accordeons />
              <PatientButton onClick={() => void accuser()} loading={occupe} loadingLabel="Enregistrement…">
                J’en ai pris connaissance
              </PatientButton>
            </section>
          ) : plafond ? (
            <p className="text-base text-foreground">{MESSAGES_TRANSMISSION[plafond]}</p>
          ) : (
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-base text-foreground">
                Votre compte rendu : un PDF de 10 Mo au plus, ou une photo (JPEG, PNG ou WebP)
                <input
                  key={cleFichier}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={occupe}
                  onChange={e => setFichier(e.target.files?.[0] ?? null)}
                  className="text-base text-foreground"
                />
              </label>
              <PatientButton onClick={() => void envoyer()} disabled={!fichier} loading={occupe} loadingLabel="Envoi…">
                Envoyer à mon praticien
              </PatientButton>
            </div>
          )}
        </div>
      </PatientCard>

      <PatientCard padding="sm">
        <h2 className="text-lg font-semibold text-foreground">Mes comptes rendus transmis</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-base text-muted-foreground">Vous n’avez encore transmis aucun compte rendu.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {documents.map((d, i) => (
              <li key={`${d.deposeLe}-${i}`} className="rounded-lg border border-border p-3">
                <p className="text-base text-foreground">
                  Déposé le {FORMAT_DATE.format(new Date(d.deposeLe))} —{' '}
                  <span className="font-semibold">{LIBELLES_STATUT_TRANSMISSION[d.statut]}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{EXPLICATIONS_STATUT_TRANSMISSION[d.statut]}</p>
              </li>
            ))}
          </ul>
        )}
      </PatientCard>
    </div>
  );
}
