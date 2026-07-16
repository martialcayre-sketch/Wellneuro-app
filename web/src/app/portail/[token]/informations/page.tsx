'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TrustEtatResponse } from '@/app/api/portail/trust/etat/route';
import { getDocumentCourant, REGISTRE_DOCUMENTS_TRUST } from '@/lib/trust/contenus/registre';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

const LIBELLE_FINALITE: Record<string, string> = {
  partage_medecin_traitant: 'Partage avec le médecin traitant',
  communications_non_essentielles: 'Communications non essentielles',
};
const LIBELLE_STATUT_CHOIX: Record<string, string> = {
  accorde: 'Autorisé',
  refuse: 'Refusé',
  retire: 'Retiré',
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));


function CarteCentre({ id, titre, children }: { id: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="w-full">
      <PatientCard className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">{titre}</h2>
        {children}
      </PatientCard>
    </section>
  );
}

// Centre permanent « Informations, confidentialité et droits » (TRUST LOT-02).
// Consultable depuis toutes les pages du portail (lien pied de page). La
// version canonique des documents est rendue depuis le registre versionné ;
// l'état individuel (accusés, choix) vient de l'API de session.
export default function InformationsPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [etat, setEtat] = useState<TrustEtatResponse | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/portail/trust/etat?token=${encodeURIComponent(token)}`);
      if (res.status === 401 || res.status === 403) {
        router.replace(`/portail/${token}`);
        return;
      }
      setEtat((await res.json()) as TrustEtatResponse);
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

  const cadre = getDocumentCourant('cadre_accompagnement');
  const limites = getDocumentCourant('limites_securite');
  const donnees = getDocumentCourant('donnees_confidentialite');
  const ia = getDocumentCourant('usage_ia');
  const droits = getDocumentCourant('droits_patient');

  const etatLecture = (documentKey: string, version: string): string => {
    const pris = etat.accuses.find(
      a => a.documentKey === documentKey && a.documentVersion === version && a.type === 'pris_connaissance',
    );
    if (pris) return `Pris connaissance le ${formatDate(pris.date)}`;
    const presente = etat.accuses.find(
      a => a.documentKey === documentKey && a.documentVersion === version && a.type === 'presente',
    );
    if (presente) return `Présenté le ${formatDate(presente.date)}`;
    return 'Version actuelle';
  };

  const choixCourant = (finalite: string): string => {
    const evenement = etat.choixCourants.find(c => c.finalite === finalite);
    return evenement ? LIBELLE_STATUT_CHOIX[evenement.statut] ?? evenement.statut : 'Non autorisé';
  };

  const documentsListes = [cadre, limites, donnees, ia, droits];

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PatientPageHeader title="Informations, confidentialité et droits" />
        <Link
          href={`/portail/${token}/questionnaires`}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          ← Mon espace
        </Link>
      </div>

      <CarteCentre id="accompagnement" titre="Mon accompagnement">
        <DocumentTrust document={cadre} />
      </CarteCentre>

      <CarteCentre id="securite" titre="Limites et sécurité médicale">
        <DocumentTrust document={limites} accordeons />
      </CarteCentre>

      <CarteCentre id="donnees" titre="Données personnelles et confidentialité">
        <DocumentTrust document={donnees} accordeons />
      </CarteCentre>

      <CarteCentre id="ia" titre="L’intelligence artificielle">
        <DocumentTrust document={ia} accordeons />
      </CarteCentre>

      <CarteCentre id="droits" titre="Vos droits et vos choix">
        <DocumentTrust document={droits} />
      </CarteCentre>

      <CarteCentre id="choix" titre="Mes choix et autorisations">
        <dl className="divide-y divide-border text-sm">
          {Object.entries(LIBELLE_FINALITE).map(([finalite, libelle]) => (
            <div key={finalite} className="flex items-center justify-between gap-3 py-2">
              <dt className="text-foreground">{libelle}</dt>
              <dd className="text-muted-foreground">{choixCourant(finalite)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-foreground">Réutilisation secondaire de vos données</dt>
            <dd className="text-muted-foreground">Non proposée</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Aucun choix n’est précoché ; refuser un choix facultatif ne bloque jamais votre
          accompagnement.
        </p>
      </CarteCentre>

      <CarteCentre id="documents" titre="Mes documents d’information">
        <ul className="divide-y divide-border text-sm">
          {documentsListes.map(doc => (
            <li key={doc.key} className="py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-foreground">{doc.titre}</span>
              <span className="text-xs text-muted-foreground">
                {doc.version} — {etatLecture(doc.key, doc.version)}
              </span>
            </li>
          ))}
        </ul>
      </CarteCentre>

      <CarteCentre id="versions" titre="Historique des versions">
        <ul className="divide-y divide-border text-sm">
          {REGISTRE_DOCUMENTS_TRUST.map(doc => (
            <li key={`${doc.key}@${doc.version}`} className="py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-foreground">{doc.titre}</span>
                <span className="text-xs text-muted-foreground">
                  {doc.version} — publiée le {doc.publieLe}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{doc.changeSummary}</p>
            </li>
          ))}
        </ul>
      </CarteCentre>
    </div>
  );
}
