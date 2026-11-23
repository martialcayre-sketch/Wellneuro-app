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
// réessayant (filet de 2 px et titre danger) ; « constat » pour un refus qui
// ne le peut pas (filet neutre, sans « Réessayer », [[D-488]] §7).
//
// PARTOUT depuis PAT-7j (arbitrage F3 a du 2026-11-21, liste commune
// 20261121-1633-d) : la forme simple, sans cadre, est retirée. Sans `forme`
// explicite, un état qui propose « Réessayer » est une erreur, un état qui ne
// le propose pas est un constat — la règle que suivaient déjà les appelants
// (`onReessayer` absent quand l'échec est définitif).
export type FormeEtat = 'erreur' | 'constat';

const CADRE: Record<FormeEtat, { cadre: string; titre: string }> = {
  erreur: { cadre: 'border-2 border-status-danger', titre: 'text-status-danger' },
  constat: { cadre: 'border border-border', titre: 'text-foreground' },
};

export function PatientErrorState({
  message,
  conserveLocalement,
  onReessayer,
  aide = 'Si le problème persiste, contactez votre praticien.',
  forme,
  children,
}: {
  message: string;
  conserveLocalement?: boolean;
  onReessayer?: () => void;
  aide?: string;
  forme?: FormeEtat;
  children?: ReactNode;
}) {
  const encadre = CADRE[forme ?? (onReessayer ? 'erreur' : 'constat')];
  return (
    <div className={`space-y-3 rounded bg-surface px-4 py-3.5 ${encadre.cadre}`}>
      <p className={`text-base font-semibold ${encadre.titre}`}>{message}</p>
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
        <p className="text-sm text-muted-foreground">{aide}</p>
      </div>
    </div>
  );
}
