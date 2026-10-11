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

// Délai avant de révoquer l'URL du fichier. Sur iPhone, Safari demande
// d'abord « Télécharger ? » et ne lit le fichier qu'après la réponse : révoquée
// tout de suite, l'URL ne mène plus à rien et le téléchargement échoue sans
// bruit. 40 s, comme FileSaver.js.
export const DELAI_REVOCATION_MS = 40_000;

// Ce qu'il reste à toucher une fois le fichier fabriqué. Aucune page web ne peut
// écrire dans l'agenda : le téléphone demande toujours une confirmation, et
// Android passe d'abord par son message de téléchargement (« Ouvrir »), que la
// page ne peut pas sauter. On nomme donc le geste du téléphone, sans promettre
// une ouverture automatique. L'iPad se présente comme un Mac : seul l'écran
// tactile le trahit.
export function consigneApresTelechargement(userAgent: string, pointsTactiles: number): string {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && pointsTactiles > 1);
  const consigne = ios
    ? 'Touchez « Télécharger » si on vous le demande, puis confirmez l’ajout au Calendrier. Si rien ne s’ouvre, le fichier « rappel-du-matin.ics » est dans l’app Fichiers : touchez-le.'
    : /Android/.test(userAgent)
      ? 'Touchez « Ouvrir » dans le message de téléchargement, puis confirmez l’ajout dans votre agenda. Si le message a disparu, le fichier « rappel-du-matin.ics » est dans vos téléchargements : touchez-le.'
      : // Ailleurs, c'est un ordinateur : son agenda ne sonne pas forcément sur le téléphone.
        'Le fichier « rappel-du-matin.ics » est prêt : ouvrez-le pour l’ajouter à votre agenda. Pour qu’il sonne sur votre téléphone, ajoutez-le plutôt depuis votre téléphone.';
  return `${consigne} Le télécharger une seconde fois ajouterait un second rappel.`;
}

// `crypto.randomUUID` manque avant Safari 15.4 / Chrome 92 et hors HTTPS. L'UID
// n'a qu'à être unique pour le calendrier du patient : un tirage suffit.
function identifiant(): string {
  const aleatoire =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${aleatoire}@rappel`;
}

export function RappelDuMatin({
  premierMatin,
  nombreDeMatins,
}: {
  premierMatin: string; // AAAA-MM-JJ
  nombreDeMatins: number;
}) {
  const [heure, setHeure] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [fait, setFait] = useState(false);

  function ajouter() {
    if (heure === undefined) {
      setMessage('Choisissez d’abord l’heure du rappel.');
      return;
    }
    try {
      const ics = genererRappelIcs({
        heure,
        dateDebut: premierMatin,
        nombre: nombreDeMatins,
        uid: identifiant(),
        maintenant: new Date(),
      });
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'rappel-du-matin.ics';
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), DELAI_REVOCATION_MS);
    } catch {
      setMessage('Le fichier n’a pas pu être préparé sur cet appareil.');
      return;
    }
    setFait(true);
    setMessage(consigneApresTelechargement(navigator.userAgent, navigator.maxTouchPoints ?? 0));
  }

  return (
    <PatientCard padding="sm" className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Un rappel chaque matin</h3>
      <p className="text-xs text-muted-foreground">
        Ajoutez un rappel à l’agenda de votre téléphone, jusqu’à la fin de votre agenda du
        sommeil. Il est enregistré dans votre agenda, pas chez nous : nous n’envoyons rien, et
        vous pouvez le supprimer à tout moment.
      </p>
      <SelecteurHeure
        id="agenda-heure-rappel"
        label="Heure du rappel"
        valeur={heure}
        heureDebut={5}
        onChange={(v) => {
          setMessage('');
          setFait(false);
          setHeure(v);
        }}
      />
      <PatientButton variant="neutral" onClick={ajouter}>
        {fait ? 'Télécharger à nouveau' : 'Ajouter à mon agenda'}
      </PatientButton>
      {/* Toujours montée, seul son texte change : une zone `aria-live`
          insérée déjà remplie n'est souvent pas annoncée. */}
      <p id="agenda-rappel-message" aria-live="polite" className="text-xs text-muted-foreground">
        {message}
      </p>
    </PatientCard>
  );
}
