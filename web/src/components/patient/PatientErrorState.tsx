import type { ReactNode } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';

// État vide/erreur uniforme du portail patient (HC-F LOT-04, Étape 9).
// Précise systématiquement : ce qui s'est passé (en français simple, jamais
// de code technique) ; si les réponses sont conservées ; l'action possible ;
// comment obtenir de l'aide si aucune action n'est possible.
//
// FORME ENCADRÉE (refonte Lien, PAT-3, prototype validé le 2026-11-11) :
// l'état de données de l'Empreinte — un cadre, le message en titre, l'action
// locale et l'aide dessous. « erreur » pour une lecture qui peut réussir en
// réessayant (filet et titre danger) ; « constat » pour un refus qui ne le
// peut pas (filet neutre, sans « Réessayer », [[D-488]] §7). Opt-in : les
// écrans des autres lots gardent la forme simple jusqu'à leur propre lot.
export type FormeEtat = 'simple' | 'erreur' | 'constat';

const CADRE: Record<Exclude<FormeEtat, 'simple'>, { cadre: string; titre: string }> = {
  erreur: { cadre: 'border-status-danger', titre: 'text-status-danger' },
  constat: { cadre: 'border-border', titre: 'text-foreground' },
};

export function PatientErrorState({
  message,
  conserveLocalement,
  onReessayer,
  aide = 'Si le problème persiste, contactez votre praticien.',
  forme = 'simple',
  children,
}: {
  message: string;
  conserveLocalement?: boolean;
  onReessayer?: () => void;
  aide?: string;
  forme?: FormeEtat;
  children?: ReactNode;
}) {
  const encadre = forme === 'simple' ? null : CADRE[forme];
  return (
    <div className={encadre ? `space-y-3 rounded-lg border bg-surface p-4 ${encadre.cadre}` : 'space-y-3'}>
      <p className={encadre ? `text-base font-semibold ${encadre.titre}` : 'text-sm text-foreground'}>{message}</p>
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
        <p className={encadre ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground'}>{aide}</p>
      </div>
    </div>
  );
}
