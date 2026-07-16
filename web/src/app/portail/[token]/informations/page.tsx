'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TrustEtatResponse } from '@/app/api/portail/trust/etat/route';
import { getDocumentCourant, REGISTRE_DOCUMENTS_TRUST } from '@/lib/trust/contenus/registre';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { MesChoix } from '@/components/patient/trust/MesChoix';
import { SignalerProbleme } from '@/components/patient/trust/SignalerProbleme';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

const LIBELLE_CATEGORIE_SIGNALEMENT: Record<string, string> = {
  effet_indesirable: 'Effet indésirable suspecté',
  incident_confidentialite: 'Incident de confidentialité',
  demande_droit: 'Demande de droit',
};
const LIBELLE_STATUT_TRAITEMENT: Record<string, string> = {
  recu: 'Reçu',
  en_cours: 'En cours d’examen',
  traite: 'Traité',
  clos: 'Clos',
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
        <MesChoix
          token={token}
          choixCourants={etat.choixCourants}
          historiqueChoix={etat.historiqueChoix}
          onChange={() => void charger()}
        />
      </CarteCentre>

      <CarteCentre id="signaler" titre="Signaler un problème">
        <SignalerProbleme token={token} onEnvoye={() => void charger()} />
        {etat.signalements.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-semibold text-foreground mb-1">Mes signalements et demandes</p>
            <ul className="divide-y divide-border text-sm">
              {etat.signalements.map(s => (
                <li key={`${s.categorie}-${s.soumisLe}`} className="py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-foreground">
                    {LIBELLE_CATEGORIE_SIGNALEMENT[s.categorie] ?? s.categorie}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.soumisLe)} — {LIBELLE_STATUT_TRAITEMENT[s.statutTraitement] ?? s.statutTraitement}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
