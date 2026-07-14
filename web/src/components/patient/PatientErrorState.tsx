import type { ReactNode } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';

// État vide/erreur uniforme du portail patient (HC-F LOT-04, Étape 9).
// Précise systématiquement : ce qui s'est passé (en français simple, jamais
// de code technique) ; si les réponses sont conservées ; l'action possible ;
// comment obtenir de l'aide si aucune action n'est possible.
export function PatientErrorState({
  message,
  conserveLocalement,
  onReessayer,
  aide = 'Si le problème persiste, contactez votre praticien.',
  children,
}: {
  message: string;
  conserveLocalement?: boolean;
  onReessayer?: () => void;
  aide?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">{message}</p>
      {conserveLocalement && (
        <p className="text-xs text-muted-foreground">Vos réponses restent conservées sur cet appareil.</p>
      )}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        {onReessayer && (
          <PatientButton variant="ghost" onClick={onReessayer}>
            Réessayer
          </PatientButton>
        )}
        <p className="text-xs text-muted-foreground">{aide}</p>
      </div>
    </div>
  );
}
