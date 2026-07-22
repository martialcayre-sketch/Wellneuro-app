import { BanniereDiffere } from '@/components/ui/BanniereDiffere';

// Écran réservé (maquette 5.0, campagne C3) — 100 % statique : fixe
// l'intention du fil de correspondance médecin, aucune donnée, aucune route
// API. Le cadrage vit dans docs/claude/propositions/2026-07-18-c3-*.
export const metadata = { title: 'Wellneuro — Correspondance' };

export default function CorrespondancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Réseau de soin · campagne C3
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Correspondance</h2>
        <p className="text-base text-muted-foreground mt-1">
          Le courrier devient un fil : la réponse du médecin traitant et ses pièces
          jointes reviennent par le même canal, tracées.
        </p>
      </div>

      <BanniereDiffere>
        Le fil réutilisera la chaîne Documents (C3) et l&apos;identité patient durable ;
        le stockage de pièces jointes biologiques exige un hébergement de données de
        santé (HDS). D&apos;ici là, les canaux officiels restent les documents validés
        et les rendez-vous de suivi — chaque échange y est tracé.
      </BanniereDiffere>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Ce que cet écran reliera</h3>
        <p className="mt-2 text-base text-muted-foreground">
          Courrier de point de situation validé pour diffusion, réponse du médecin par
          le même canal, rapprochement des résultats avec le dossier (estimé ↔ mesuré).
          Aperçu conceptuel, non contractuel.
        </p>
      </div>
    </div>
  );
}
