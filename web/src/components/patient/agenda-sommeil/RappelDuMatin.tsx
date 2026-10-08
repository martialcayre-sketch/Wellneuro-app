'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { genererRappelIcs } from '@/lib/agenda-sommeil/rappelCalendrier';
import { SelecteurHeure } from './SelecteurHeure';

// « Un rappel chaque matin », que le patient ajoute LUI-MÊME à l'agenda de son
// téléphone : un fichier calendrier fabriqué ici, dans le navigateur, au clic.
// Le serveur n'envoie rien et ne garde rien — aucune tâche planifiée, aucune
// relance (REGISTRE_FRONTIERES.md) ; c'est le téléphone qui sonne. Le contenu
// du fichier (ni lien, ni mot de santé) est fixé par `rappelCalendrier.ts`.
//
// Proposé, jamais insisté : une carte discrète, sans relance si le patient ne
// s'en sert pas, et aucune trace de son choix.

export function RappelDuMatin({
  premierMatin,
  nombreDeMatins,
}: {
  premierMatin: string; // AAAA-MM-JJ
  nombreDeMatins: number;
}) {
  const [heure, setHeure] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');

  function ajouter() {
    if (heure === undefined) {
      setMessage('Choisissez d’abord l’heure du rappel.');
      return;
    }
    const ics = genererRappelIcs({
      heure,
      dateDebut: premierMatin,
      nombre: nombreDeMatins,
      uid: `${crypto.randomUUID()}@rappel`,
      maintenant: new Date(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'rappel-du-matin.ics';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    // Révoqué au tour suivant : certains navigateurs lisent l'URL après le clic.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage(
      'Ouvrez le fichier téléchargé : votre téléphone vous propose de l’ajouter à votre agenda.',
    );
  }

  return (
    <PatientCard padding="sm" className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Un rappel chaque matin</h3>
      <p className="text-xs text-muted-foreground">
        Ajoutez un rappel à l’agenda de votre téléphone, jusqu’à la fin de votre agenda du
        sommeil. Il reste sur votre téléphone : nous n’envoyons rien, et vous pouvez le
        supprimer à tout moment.
      </p>
      <SelecteurHeure
        id="agenda-heure-rappel"
        label="Heure du rappel"
        valeur={heure}
        heureDebut={5}
        onChange={(v) => {
          setMessage('');
          setHeure(v);
        }}
      />
      <PatientButton variant="neutral" onClick={ajouter}>
        Ajouter à mon agenda
      </PatientButton>
      {message && (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </PatientCard>
  );
}
