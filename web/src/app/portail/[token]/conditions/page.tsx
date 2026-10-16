'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TrustEtatResponse } from '@/app/api/portail/trust/etat/route';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { AccuseConditions } from '@/components/patient/trust/ConditionsUtilisation';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

// LA PAGE DES CONDITIONS D'UTILISATION ([[D-292]] §3, `WN_PORTAIL_CONDITIONS`).
// Atteinte depuis « Informations, confidentialité et droits », et par le lien
// magique de l'e-mail aux patients suivis (`?vers=conditions`). Elle affiche la
// version en vigueur et, tant qu'elle n'est pas accusée, le bouton. Ouvrir la
// page ne valide rien. Drapeau fermé, elle renvoie au centre d'information.
export default function ConditionsPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [etat, setEtat] = useState<TrustEtatResponse | null>(null);

  const charger = useCallback(async () => {
    try {
      // PREMIÈRE PAGE APRÈS LE LIEN DE L'E-MAIL : le cookie que la route du lien
      // vient de poser peut ne pas être encore propagé (WebKit, serveur rapide).
      // Mêmes réessais bornés que l'accueil de l'espace avant de renvoyer : un
      // patient suivi y trouve un accueil vide, et ne verrait jamais le texte.
      let res = await fetch(`/api/portail/trust/etat?token=${encodeURIComponent(token)}`);
      for (let essai = 0; essai < 3 && (res.status === 401 || res.status === 403); essai++) {
        await new Promise(resolve => setTimeout(resolve, 300 * (essai + 1)));
        res = await fetch(`/api/portail/trust/etat?token=${encodeURIComponent(token)}`);
      }
      if (res.status === 401 || res.status === 403) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as TrustEtatResponse;
      if (data.ok && !data.conditionsOuvertes) {
        router.replace(`/portail/${token}/informations`);
        return;
      }
      setEtat(data);
    } catch {
      setEtat({ ok: false, reason: 'network', error: 'Erreur réseau. Réessayez.' });
    }
  }, [token, router]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (!etat) {
    return (
      <PatientCard>
        <p className="text-sm text-muted-foreground" role="status">Chargement…</p>
      </PatientCard>
    );
  }
  if (!etat.ok) {
    return (
      <PatientCard>
        <PatientErrorState message={etat.error} onReessayer={() => void charger()} />
      </PatientCard>
    );
  }

  const conditions = getDocumentCourant('conditions_utilisation');
  const accuse = etat.accuses.find(
    a =>
      a.documentKey === conditions.key &&
      a.documentVersion === conditions.version &&
      a.type === 'pris_connaissance',
  );

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PatientPageHeader title="Informations, confidentialité et droits" />
        {/* Vers l'accueil de l'espace, qui choisit l'étape (consentement, fiche,
            parcours) : arrivé par le lien de l'e-mail, le patient n'y est pas
            encore passé dans cette session. */}
        <Link href={`/portail/${token}`} className="shrink-0 text-sm text-primary hover:underline">
          ← Mon espace
        </Link>
      </div>
      <PatientCard className="space-y-4">
        {accuse ? (
          <>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-foreground">{conditions.titre}</h2>
              <p className="text-sm text-muted-foreground">Pris connaissance le {formatDate(accuse.date)}</p>
            </div>
            <DocumentTrust document={conditions} accordeons />
          </>
        ) : (
          <AccuseConditions onAccuse={() => void charger()} />
        )}
      </PatientCard>
    </div>
  );
}
