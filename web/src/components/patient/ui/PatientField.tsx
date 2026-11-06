import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

export const patientInputClassName =
  'w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

type ProprietesChamp = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

const CHAMPS_NATIFS = new Set(['input', 'select', 'textarea']);

function estChampNatif(enfant: ReactNode): enfant is ReactElement<ProprietesChamp> {
  return isValidElement(enfant) && typeof enfant.type === 'string' && CHAMPS_NATIFS.has(enfant.type);
}

// Label + champ commun du portail patient — factorise labelCls/inputCls et le
// motif `{label}{requis && ' *'}` dupliqués à travers les écrans du portail
// avant HC-F LOT-04. Ne change aucune donnée collectée : purement présentationnel.
//
// Accessibilité (WCAG 1.3.1 / 4.1.2) : le libellé est relié au PREMIER enfant
// direct qui est un champ natif (`input`, `select`, `textarea`) — son `id`
// existant est respecté, sinon un `useId()` lui est posé. Un groupe de choix
// (boutons, cases) passe `groupe` : le libellé devient la `legend` d'un
// `fieldset`, à apparence constante (le preflight Tailwind remet à zéro les
// marges et retraits des deux éléments ; `min-w-0` neutralise la largeur
// minimale propre au `fieldset`).
export function PatientField({
  label,
  requis = false,
  suffixe,
  erreur,
  groupe = false,
  children,
  className = '',
}: {
  label: string;
  requis?: boolean;
  suffixe?: string;
  /** Message d'erreur affiché sous le champ, annoncé par `aria-describedby`. */
  erreur?: string;
  /** Groupe de choix : `fieldset` + `legend` au lieu de `label`. */
  groupe?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const idAuto = useId();
  const idErreur = `${idAuto}-erreur`;

  const libelle = (
    <>
      {label}
      {requis && ' *'}
      {suffixe && <span className="text-muted-foreground/70 font-normal"> ({suffixe})</span>}
    </>
  );
  const classeLibelle = 'block text-sm font-medium text-muted-foreground mb-1';
  const messageErreur = erreur ? (
    <p id={idErreur} className="mt-1 text-xs text-status-danger">{erreur}</p>
  ) : null;

  if (groupe) {
    return (
      <fieldset className={`min-w-0 ${className}`.trim()} aria-describedby={erreur ? idErreur : undefined}>
        <legend className={classeLibelle}>{libelle}</legend>
        {children}
        {messageErreur}
      </fieldset>
    );
  }

  let idChamp: string | undefined;
  const enfants = Children.map(children, enfant => {
    if (idChamp !== undefined || !estChampNatif(enfant)) return enfant;
    idChamp = enfant.props.id ?? idAuto;
    if (!erreur) return enfant.props.id ? enfant : cloneElement(enfant, { id: idChamp });
    const decrit = [enfant.props['aria-describedby'], idErreur].filter(Boolean).join(' ');
    return cloneElement(enfant, { id: idChamp, 'aria-describedby': decrit, 'aria-invalid': true });
  });

  return (
    <div className={className}>
      <label htmlFor={idChamp} className={classeLibelle}>
        {libelle}
      </label>
      {enfants}
      {messageErreur}
    </div>
  );
}
