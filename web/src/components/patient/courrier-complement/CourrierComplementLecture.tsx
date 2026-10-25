'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailCourrierComplementResponse } from '@/app/api/portail/courrier-complement/route';
import type { CourrierComplementServi } from '@/lib/correspondance/courrierComplementServicePatient';
import { AvisLectureDatee } from '@/components/patient/AvisLectureDatee';
import { ConsignerLecturePortail } from '@/components/patient/ConsignerLecturePortail';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { dateDeRemiseCourrier } from '@/components/patient/lettre-adressage/textesLettre';
import {
  AUCUN_COURRIER_COMPLEMENT,
  ligneDestinataire,
  MENTION_INDISPONIBLE_COMPLEMENT,
  PHRASE_COURRIER_COMPLEMENT,
  TITRE_COURRIER_COMPLEMENT,
} from './textesCourrierComplement';

// Le courrier au médecin avant un complément ciblé, remis au patient
// ([[D-345]], J3-12h lot 4). Patron de `CourrierMedecinLecture` : la route garde
// l'accès et le drapeau ; 401 renvoie au portail, 403 et 503 sont définitifs,
// le reste se réessaie.
//
// LA LECTURE N'EST CONSIGNÉE QU'UNE FOIS LE TEXTE AFFICHÉ : l'accusé est monté
// sous le texte, et seulement pour un courrier servi.
//
// Le texte et le destinataire sont insérés comme enfants React, jamais comme
// HTML. Le destinataire est celui saisi par le praticien, sans ajout.

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; courrier: CourrierComplementServi | null };

export function CourrierComplementLecture({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/courrier-complement', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailCourrierComplementResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 503 });
        return;
      }
      if (!('courrier' in data)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', courrier: data.courrier });
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

  if (etat.statut === 'chargement') {
    return (
      <PatientCard padding="sm">
        <p className="text-sm text-muted-foreground">Chargement du courrier…</p>
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

  const courrier = etat.courrier;
  if (!courrier) {
    return (
      <PatientCard padding="sm">
        <p className="text-base text-foreground">{AUCUN_COURRIER_COMPLEMENT}</p>
      </PatientCard>
    );
  }

  const date = dateDeRemiseCourrier(courrier.remiseLe);
  const servi = courrier.etat === 'servie' && Boolean(courrier.texte);

  return (
    <article className="space-y-6">
      {/* En tête, avant le courrier, et sous la MÊME condition que la
          consignation plus bas : la page qui date sert la phrase ([[D-297]] §4). */}
      {servi && <AvisLectureDatee />}
      <PatientCard>
        <header className="border-b border-border pb-5 print:hidden">
          <h1 className="text-2xl font-semibold text-foreground">{TITRE_COURRIER_COMPLEMENT}</h1>
          {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
          {servi && <p className="mt-3 text-base text-foreground">{PHRASE_COURRIER_COMPLEMENT}</p>}
          {servi && courrier.destinataire && (
            <p className="mt-2 text-base text-foreground">{ligneDestinataire(courrier.destinataire)}</p>
          )}
          {courrier.etat === 'indisponible' && (
            <p className="mt-3 text-base text-foreground">{MENTION_INDISPONIBLE_COMPLEMENT}</p>
          )}
        </header>

        {servi && (
          <section aria-label="Texte du courrier" className="mt-6">
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground">{courrier.texte}</p>
          </section>
        )}
      </PatientCard>

      {servi && (
        <div className="print:hidden">
          {/* LA FEUILLE À IMPRIMER EST CELLE DU MÉDECIN : en-tête, nom, date —
              rendue au serveur par le même chokepoint que le courrier préparé. */}
          <a
            href="/api/portail/courrier-complement/impression"
            target="_blank"
            rel="noopener noreferrer"
            className={patientButtonClassName('ghost')}
          >
            Ouvrir la version à imprimer
          </a>
          <ConsignerLecturePortail espece="courrier_complement" idObjet={courrier.idRemise} />
        </div>
      )}
    </article>
  );
}
