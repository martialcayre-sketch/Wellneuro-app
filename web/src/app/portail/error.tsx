'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef } from 'react';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientButton } from '@/components/patient/ui/PatientButton';

// Ce qu'une personne voit quand une page de son espace échoue à s'afficher.
//
// Sans ce fichier, la panne remontait jusqu'à `global-error.tsx`, qui rend du
// HTML système hors charte et remplace la page entière : quelqu'un venu
// déposer des données de santé se retrouvait devant un écran qui ne
// ressemblait plus à rien de connu. Ici, l'en-tête et le pied de page du
// portail restent en place — seul le contenu est remplacé.
//
// CE QUE LE MESSAGE DIT, et pourquoi ces quatre points précisément : la
// personne doit apprendre qu'elle n'a rien cassé, que ce qu'elle a déjà
// transmis est conservé, que réessayer a du sens, et que son praticien reste
// le recours si cela dure. C'est ce qui manque le plus quand on bute sur un
// écran d'erreur dans un service de santé.
//
// CE QUE LE MESSAGE NE DIT PAS, délibérément : quel composant est tombé. Le
// nom d'un sous-traitant technique n'apprend rien d'utile à un patient et
// renseignerait qui sonde le service. La transparence sur les sous-traitants a
// son lieu propre — le document de confidentialité du registre TRUST, où ils
// sont nommés et datés. Un écran d'erreur n'est pas un registre.
//
// PORTÉE RÉELLE, à ne pas surestimer : ce filet ne joue que si l'application
// répond. Si l'hébergeur lui-même est indisponible, la page servie n'est pas
// celle-ci mais celle de son routeur, et rien ici ne s'exécute — d'où la
// nécessité d'une page d'état hébergée ailleurs, qui reste à faire.
export default function PortailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const titreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Le détail reste côté serveur : la console du navigateur d'un patient
    // n'est pas un journal.
    //
    // `digest` n'est posé que par le rendu SERVEUR (Next le calcule dans son
    // gestionnaire d'erreur de rendu). Une erreur survenue dans le navigateur
    // — le cas dominant, la plupart des pages du portail étant clientes —
    // n'en porte pas : la ligne « Référence » ne s'affiche alors pas, et il
    // n'existe aujourd'hui aucune trace côté serveur pour elle, faute de
    // rapporteur d'erreurs câblé au build. L'écran reste utile sans elle ; le
    // câblage est un lot séparé.
    console.error('Erreur du portail', { digest: error.digest });
  }, [error]);

  useEffect(() => {
    // Le contenu de la page vient d'être remplacé sans navigation : sans ce
    // déplacement de focus, un lecteur d'écran ne l'annonce pas et le focus
    // retombe sur `body`.
    titreRef.current?.focus();
  }, []);

  // `reset()` seul re-rend les mêmes enfants : si l'échec vient du rendu
  // serveur, le payload en échec est rejoué tel quel et le bouton semble ne
  // rien faire — l'impasse exacte que cet écran doit supprimer. `refresh()`
  // redemande d'abord le rendu au serveur.
  const reessayer = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <PatientCard className="space-y-4">
        {/* `role="alert"` et le focus font annoncer le remplacement du
            contenu ; `tabIndex={-1}` rend le bloc focusable sans l'insérer
            dans l'ordre de tabulation. */}
        <div ref={titreRef} role="alert" tabIndex={-1} className="outline-none">
          <PatientPageHeader
            center
            title="Cette page n’a pas pu s’afficher"
            subtitle="Le problème vient de notre côté, pas du vôtre. Les informations que vous avez déjà transmises sont conservées."
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Réessayez dans quelques minutes. Si cela se reproduit, parlez-en à
          votre praticien.
        </p>
        <PatientButton type="button" variant="primary" className="w-full" onClick={reessayer}>
          Réessayer
        </PatientButton>
        {error.digest && (
          // Contraste plein : c'est la chaîne que la personne doit relever au
          // téléphone pour le support.
          <p className="text-xs text-muted-foreground text-center">
            Référence : {error.digest}
          </p>
        )}
      </PatientCard>
    </div>
  );
}
