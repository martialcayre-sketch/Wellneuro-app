// Indicateur de statut de sauvegarde du portail patient (HC-F LOT-04, Étape 5).
// Distingue explicitement ce qui est *conservé localement* de ce qui est
// *transmis*, conformément à l'interdit du brief : ne jamais afficher
// "Enregistré" si les réponses ne sont que locales.
//
// « Synchronisé » n'existe pas dans ce lot : aucune sauvegarde serveur de
// brouillon n'existe réellement aujourd'hui (seule la transmission finale est
// persistante côté serveur) — l'afficher serait mentir sur l'état réel.
export type SaveError = 'network' | 'submission-incomplete';

function formatHeure(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function SaveStatusIndicator({ savedAt, error }: { savedAt: Date | null; error?: SaveError }) {
  if (error === 'network') {
    return (
      <p className="text-xs text-muted-foreground">
        Connexion interrompue — vos réponses restent conservées sur cet appareil.
      </p>
    );
  }

  if (error === 'submission-incomplete') {
    return (
      <p className="text-xs text-muted-foreground">
        Transmission non terminée — vos réponses restent conservées sur cet appareil.
      </p>
    );
  }

  if (!savedAt) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Brouillon enregistré sur cet appareil — dernière sauvegarde à {formatHeure(savedAt)}. Il ne sera transmis à
      votre praticien qu’après validation.
    </p>
  );
}
