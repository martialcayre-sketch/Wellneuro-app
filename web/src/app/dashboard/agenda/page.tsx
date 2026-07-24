import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { AgendaPraticien } from '@/components/agenda/AgendaPraticien';

// Agenda praticien (accueil-observatoire LOT-04) : le workflow RDV, jusqu'ici
// différé (registre R6 produit / E5), devient un CRUD minimal. Les patients
// actifs DU PRATICIEN sont chargés côté serveur pour le formulaire ; les
// rendez-vous eux-mêmes sont lus/écrits par les routes /api/praticien/rendez-vous.
export const metadata = { title: 'Wellneuro — Agenda & consultations' };

export default async function AgendaPage() {
  const session = await getServerSession(authOptions);
  const email = emailPraticien(session);
  const patients = email
    ? await prisma.patient.findMany({
        where: { actif: true, ...filtrePatientsDuPraticien(email) },
        select: { idPatient: true, prenom: true, nom: true },
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        take: 200,
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Transverse — donne son tempo à la boucle
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Agenda & consultations</h2>
        <p className="text-base text-muted-foreground mt-1 max-w-2xl">
          Planifiez les rendez-vous de la semaine : chaque consultation du jour
          remonte dans le Fil sous forme de carte « Pré-vol prêt », prête à ouvrir
          la préparation du copilote.
        </p>
      </div>

      <AgendaPraticien
        patients={patients.map(p => ({ idPatient: p.idPatient, nomComplet: `${p.prenom} ${p.nom}`.trim() }))}
      />
    </div>
  );
}
