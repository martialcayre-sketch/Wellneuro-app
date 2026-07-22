import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { PreVolPanel } from '@/components/copilote/PreVolPanel';
import { LectureEtatPassePanel } from '@/components/copilote/LectureEtatPassePanel';
import { ClotureMinuteApresPanel } from '@/components/copilote/ClotureMinuteApresPanel';

// Consultation copilote — pré-vol T-10 min (SP-COP LOT-01) et minute d'après
// (LOT-02). L'entrée de rail était réservée dans la maquette 5.0 sans écran
// derrière ; elle en a un désormais. Sans patient sélectionné, la page propose
// la liste des patients actifs DU PRATICIEN : elle ne devine pas de qui il
// s'agit, et ne montre pas ceux d'un autre.
// LECTURE SEULE de bout en bout — aucune action, aucun envoi.

export default async function CopilotePage({
  searchParams,
}: {
  searchParams: Promise<{ idPatient?: string }>;
}) {
  const { idPatient } = await searchParams;
  const idValide = typeof idPatient === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(idPatient) ? idPatient : null;

  const session = await getServerSession(authOptions);
  const email = emailPraticien(session);
  // Sans e-mail de session lisible, aucun patient n'est listé : le middleware
  // protège déjà /dashboard, mais on ne se repose pas là-dessus pour décider
  // ce qui s'affiche.
  const duPraticien = email ? filtrePatientsDuPraticien(email) : null;

  if (idValide) {
    const patient = duPraticien
      ? await prisma.patient.findFirst({
          where: { idPatient: idValide, ...duPraticien },
          select: { prenom: true, nom: true },
        })
      : null;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Consultation copilote</h2>
          <p className="mt-1 text-base text-muted-foreground">
            {patient
              ? `Pré-vol — ${patient.prenom} ${patient.nom}. Lecture seule : rien n’est enregistré ni envoyé depuis cet écran.`
              : 'Patient introuvable.'}
          </p>
        </div>
        {patient && <PreVolPanel idPatient={idValide} />}
        {patient && <ClotureMinuteApresPanel idPatient={idValide} />}
        {patient && <LectureEtatPassePanel idPatient={idValide} />}
        <Link
          href="/dashboard/copilote"
          className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          ← Changer de patient
        </Link>
      </div>
    );
  }

  const patients = duPraticien
    ? await prisma.patient.findMany({
        where: { actif: true, ...duPraticien },
        select: { idPatient: true, prenom: true, nom: true },
        orderBy: { nom: 'asc' },
        take: 100,
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Consultation copilote</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Dix minutes avant la consultation : ce qui a changé depuis la précédente, et les questions que cela ouvre.
          Choisissez le patient à préparer.
        </p>
      </div>

      {patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun patient actif.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patients.map((patient) => (
            <li key={patient.idPatient}>
              <Link
                href={`/dashboard/copilote?idPatient=${encodeURIComponent(patient.idPatient)}`}
                className="flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {patient.prenom} {patient.nom}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
