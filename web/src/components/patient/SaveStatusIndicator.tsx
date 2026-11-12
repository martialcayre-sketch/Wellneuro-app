// Indicateur de statut de sauvegarde du portail patient (HC-F LOT-04, Étape 5).
// Distingue explicitement ce qui est *conservé localement* de ce qui est
// *transmis*, conformément à l'interdit du brief : ne jamais afficher
// "Enregistré" si les réponses ne sont que locales.
//
// « Synchronisé » n'existe pas dans ce lot : aucune sauvegarde serveur de
// brouillon n'existe réellement aujourd'hui (seule la transmission finale est
// persistante côté serveur) — l'afficher serait mentir sur l'état réel.
export type SaveError = 'network' | 'submission-incomplete';

/**
 * Les trois phrases de l'indicateur. Les textes par défaut, « sur cet
 * appareil », sont ceux des questionnaires et des plaintes, dont le brouillon
 * vit en `localStorage`. L'entrée du parcours passe les siens, « dans cet
 * onglet » (T-37 à T-39, [[D-488]]), son brouillon vivant en `sessionStorage`.
 */
export type TextesSauvegarde = {
  brouillon: (heure: string) => string;
  reseau: string;
  transmission: string;
};

const TEXTES_PAR_DEFAUT: TextesSauvegarde = {
  brouillon: heure =>
    `Brouillon enregistré sur cet appareil — dernière sauvegarde à ${heure}. Il ne sera transmis à votre praticien qu’après validation.`,
  reseau: 'Connexion interrompue — vos réponses restent conservées sur cet appareil.',
  transmission: 'Transmission non terminée — vos réponses restent conservées sur cet appareil.',
};

function formatHeure(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function SaveStatusIndicator({
  savedAt,
  error,
  textes = TEXTES_PAR_DEFAUT,
}: {
  savedAt: Date | null;
  error?: SaveError;
  textes?: TextesSauvegarde;
}) {
  if (error === 'network') {
    return <p className="text-xs text-muted-foreground">{textes.reseau}</p>;
  }

  if (error === 'submission-incomplete') {
    return <p className="text-xs text-muted-foreground">{textes.transmission}</p>;
  }

  if (!savedAt) return null;

  return <p className="text-xs text-muted-foreground">{textes.brouillon(formatHeure(savedAt))}</p>;
}
