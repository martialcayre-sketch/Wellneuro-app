'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { mentionValidation } from '@/lib/portail/texteMentionValidation';
import { mentionImpression } from '@/lib/portail/texteProtocoleImprimable';
import { DetailDuProtocole, EncartConduite, type ProtocoleResponse, type ProtocoleServi } from './DetailDuProtocole';

// L'IMPRIMABLE DU PROTOCOLE ([[D-392]], lettre bh, fiche H69). La page lit la
// MÊME route que l'accueil et rend le détail par le MÊME composant : rien n'est
// recalculé à part (§1). Elle n'écrit rien — imprimer ne laisse aucune trace
// (§3).
//
// Ce que l'accueil ne sert pas dans son détail ne s'imprime pas : sans
// protocole servi, en fin de cycle, ou quand la route ne dit pas `imprimable`
// (drapeau fermé, dossier non majeur), la page renvoie à l'accueil, sans texte
// neuf.

export function MonProtocoleImprimable({ token }: { token: string }) {
  const router = useRouter();
  const [protocole, setProtocole] = useState<ProtocoleServi | null>(null);

  useEffect(() => {
    let actif = true;
    void (async () => {
      let servi: ProtocoleServi | null = null;
      try {
        const res = await fetch('/api/portail/protocole', { cache: 'no-store' });
        const data = (await res.json()) as ProtocoleResponse;
        servi = data.ok ? data : null;
      } catch {
        servi = null;
      }
      if (!actif) return;
      if (
        !servi
        || !servi.imprimable
        || !servi.protocoleDiffuse
        || servi.indisponible
        || servi.finDeCycle
        || !servi.vue
        || (servi.vue.actions.length === 0 && !servi.vue.followUpCriterion)
        // UNE VERSION DONT LE DÉTAIL N'A PAS ENCORE ÉTÉ OUVERT ([[D-315]]) : la
        // même condition que le repli de l'accueil. Le lien n'y existe pas, et
        // la page, qui n'écrit rien, ne doit pas faire lire une version sans
        // que sa première ouverture soit datée ([[D-392]] §1).
        || (servi.lectureDuDetail && !servi.lectureDuDetail.dejaOuvert && (servi.pauses ?? []).length === 0)
      ) {
        router.replace(`/portail/${token}/questionnaires`);
        return;
      }
      setProtocole(servi);
    })();
    return () => {
      actif = false;
    };
  }, [router, token]);

  if (!protocole?.vue) {
    return (
      <PatientCard>
        <p className="text-sm text-muted-foreground">Chargement de votre accompagnement…</p>
      </PatientCard>
    );
  }

  const { vue } = protocole;
  const mention = protocole.valideLe ? mentionValidation(protocole.valideLe) : null;
  const impression = mentionImpression(new Date());

  return (
    <article className="space-y-4">
      <PatientCard className="space-y-5">
        <PatientPageHeader title="Votre accompagnement" subtitle={vue.purpose} />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Ce qu’on travaille :</span> {vue.priorityLabel}
        </p>

        <DetailDuProtocole vue={vue} pauses={protocole.pauses} troisPlans={protocole.troisPlans} />

        {protocole.encartConduite && <EncartConduite />}

        {/* LE PIED DATÉ ([[D-392]] §2) : la date de validation de la version
            servie, puis la date d'impression. Une feuille sans date ne dirait
            pas qu'une version suivante a pu la dépasser. */}
        <footer className="border-t border-border pt-5 text-sm text-muted-foreground">
          {mention && <p>{mention}</p>}
          {impression && <p className="mt-1">{impression}</p>}
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
