'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailLettreAdressageResponse } from '@/app/api/portail/lettre-adressage/route';
import type { LettreAdressageServie } from '@/lib/correspondance/lettreServicePatient';
import { ConsignerLecturePortail } from '@/components/patient/ConsignerLecturePortail';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import {
  AUCUN_COURRIER,
  dateDeRemiseCourrier,
  MENTION_INDISPONIBLE,
  MENTION_RETIREE,
  PHRASE_ACCOMPAGNEMENT,
  TITRE_LETTRE,
} from './textesLettre';

// Le courrier pour le médecin traitant, remis au patient ([[D-262]], LOT-03a).
// Patron de `FicheRemiseLecture` : la route garde l'accès et le drapeau ; 401
// renvoie au portail, 403 et 503 sont définitifs, le reste se réessaie.
//
// LA LECTURE N'EST CONSIGNÉE QU'UNE FOIS LE TEXTE AFFICHÉ : l'accusé est monté
// sous le texte, et seulement pour une lettre servie.
//
// Le texte est inséré comme enfant React, jamais comme HTML.

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; lettre: LettreAdressageServie | null };

export function CourrierMedecinLecture({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/lettre-adressage', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailLettreAdressageResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 503 });
        return;
      }
      if (!('lettre' in data)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', lettre: data.lettre });
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

  const lettre = etat.lettre;
  if (!lettre) {
    return (
      <PatientCard padding="sm">
        <p className="text-base text-foreground">{AUCUN_COURRIER}</p>
      </PatientCard>
    );
  }

  const date = dateDeRemiseCourrier(lettre.remiseLe);

  return (
    <article className="space-y-6">
      <PatientCard>
        <header className="border-b border-border pb-5 print:hidden">
          <h1 className="text-2xl font-semibold text-foreground">{TITRE_LETTRE}</h1>
          {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
          {lettre.etat === 'servie' && <p className="mt-3 text-base text-foreground">{PHRASE_ACCOMPAGNEMENT}</p>}
          {lettre.etat === 'retiree' && <p className="mt-3 text-base text-foreground">{MENTION_RETIREE}</p>}
          {lettre.etat === 'indisponible' && <p className="mt-3 text-base text-foreground">{MENTION_INDISPONIBLE}</p>}
        </header>

        {lettre.etat === 'servie' && lettre.texte && (
          <section aria-label="Texte du courrier" className="mt-6">
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground">{lettre.texte}</p>
          </section>
        )}
      </PatientCard>

      {lettre.etat === 'servie' && lettre.texte && (
        <div className="print:hidden">
          {/* LA FEUILLE À IMPRIMER EST CELLE DU MÉDECIN ([[D-262]], LOT-03b) :
              en-tête, nom, date, cadre interprofessionnel — rendue au serveur
              par le même chokepoint que la lettre du praticien. */}
          <a
            href="/api/portail/lettre-adressage/impression"
            target="_blank"
            rel="noopener noreferrer"
            className={patientButtonClassName('ghost')}
          >
            Ouvrir la version à imprimer
          </a>
          <ConsignerLecturePortail espece="lettre_adressage" idObjet={lettre.idRemise} />
        </div>
      )}
    </article>
  );
}
