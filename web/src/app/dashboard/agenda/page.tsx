import { BanniereDiffere } from '@/components/ui/BanniereDiffere';

// Écran réservé (maquette 4.0) — 100 % statique, aucune donnée.
export const metadata = { title: 'Wellneuro — Agenda & consultations' };

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Transverse — donne son tempo à la boucle
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Agenda & consultations</h2>
        <p className="text-base text-muted-foreground mt-1">
          Chaque consultation naît d&apos;une étape du cycle clinique et y retourne : la
          préparation lit les données, la conclusion produit la décision et les actions.
        </p>
      </div>

      <BanniereDiffere>
        Le workflow de rendez-vous est au registre des différés, sans déclencheur
        actif — cet écran fixe l&apos;intention d&apos;intégration, pas un calendrier de
        livraison.
      </BanniereDiffere>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Ce que l&apos;agenda reliera</h3>
        <p className="mt-2 text-base text-muted-foreground">
          Première consultation ← données fiables · restitution ← décision ·
          consultation de suivi ← rendez-vous de suivi J7/J14/J21. Côté patient, le
          vocabulaire reste « rendez-vous de suivi ». Aperçu conceptuel, non
          contractuel.
        </p>
      </div>
    </div>
  );
}
