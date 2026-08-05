'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailBilanResponse } from '@/app/api/portail/bilan/route';
import type { BilanPatient } from '@/lib/documents/bilanPatient';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

// « Mon bilan » — le document que le praticien a transmis, lu dans l'espace du
// patient plutôt que reçu par e-mail.
//
// Ce que le patient perdait en passant du corps de l'e-mail à cet écran, c'est
// la copie hors ligne qu'il pouvait montrer à son médecin. D'où le bouton
// d'impression, et les `print:` qui font disparaître la navigation à
// l'impression : la page doit sortir comme un document, pas comme une capture
// d'écran d'application.

export function formaterDateTransmission(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Etat =
  | { statut: 'chargement' }
  // `definitif` : un refus que réessayer ne lèvera pas (compte désactivé, accès
  // révoqué). Le bouton « Réessayer » disparaît alors — le proposer ferait
  // rejouer indéfiniment le même refus.
  | { statut: 'erreur'; message: string; definitif?: boolean }
  | { statut: 'pret'; bilan: BilanPatient | null };

export function MonBilan({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  // Garde-fou commun aux écrans du portail : ignorer une réponse tardive si le
  // composant a été démonté pendant que le fetch était en vol.
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/bilan');
      if (annuleRef.current) return;
      if (res.status === 401) {
        // Session absente ou expirée : retour au gate du portail, exactement
        // comme le hub — `router.replace`, pas un rechargement complet.
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailBilanResponse;
      if (annuleRef.current) return;
      if (res.status === 403) {
        // Le cookie est lisible, c'est le COMPTE qui est refusé. Renvoyer au
        // gate rebouclerait sans rien dire au patient : on affiche le message du
        // serveur, tel quel, et sans « Réessayer ».
        setEtat({
          statut: 'erreur',
          message: (!data.ok && data.error) || 'Accès non reconnu ou révoqué.',
          definitif: true,
        });
        return;
      }
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error });
        return;
      }
      setEtat({ statut: 'pret', bilan: data.bilan });
    } catch {
      if (annuleRef.current) return;
      setEtat({ statut: 'erreur', message: 'Connexion interrompue. Vérifiez votre connexion et réessayez.' });
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
        <p className="text-sm text-muted-foreground">Chargement de votre bilan…</p>
      </PatientCard>
    );
  }

  if (etat.statut === 'erreur') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState
          message={etat.message}
          onReessayer={etat.definitif ? undefined : () => void charger()}
        />
      </PatientCard>
    );
  }

  // Aucun bilan transmis : le dire sans laisser croire à une panne, et sans
  // annoncer de délai que personne ne tient.
  if (etat.bilan === null) {
    return (
      <PatientCard>
        <h1 className="text-2xl font-semibold text-foreground">Mon bilan</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Votre praticien ne vous a pas encore transmis de bilan. Il apparaîtra ici dès qu’il
          l’aura fait.
        </p>
      </PatientCard>
    );
  }

  const { narratif, notePraticien, mentionPreparation, transmisLe } = etat.bilan;
  const dateTransmission = formaterDateTransmission(transmisLe);

  return (
    <article className="space-y-6">
      <PatientCard>
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-foreground">Bilan neuronutritionnel</h1>
          {dateTransmission && (
            <p className="mt-1 text-sm text-muted-foreground">
              Transmis par votre praticien le {dateTransmission}
            </p>
          )}
        </header>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce que vos réponses suggèrent
          </h2>
          {/* `whitespace-pre-line` : le narratif est rédigé avec ses
              paragraphes, les écraser rendrait un pavé illisible. Le texte est
              inséré comme enfant React — jamais d'injection HTML. */}
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground">
            {narratif}
          </p>
        </section>

        {notePraticien && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Note de votre praticien
            </h2>
            <p className="mt-3 whitespace-pre-line text-base italic leading-relaxed text-foreground">
              {notePraticien}
            </p>
          </section>
        )}

        <footer className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
          <p>{mentionPreparation}</p>
          <p className="mt-1">Ce bilan ne constitue pas un diagnostic médical.</p>
        </footer>
      </PatientCard>

      <div className="print:hidden">
        <PatientButton variant="ghost" onClick={() => window.print()}>
          Imprimer ou enregistrer en PDF
        </PatientButton>
      </div>
    </article>
  );
}
