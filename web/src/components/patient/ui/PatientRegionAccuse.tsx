'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// L'accusé d'un geste qui fait DISPARAÎTRE le formulaire. Deux choses, parce que
// le geste en casse deux :
//
// - la région `status` est présente dès le premier rendu (patron de
//   `DepotDocuments`) : un lecteur d'écran n'annonce pas de façon fiable une
//   région apparue en même temps que son contenu ;
// - le focus s'y pose quand le message paraît : le bouton qui l'avait n'existe
//   plus, et il retomberait sur `body`. `tabIndex={-1}` rend le bloc focusable
//   sans l'insérer dans l'ordre de tabulation (patron de `portail/error.tsx`).
//
// Le focus ne bouge qu'au PASSAGE à visible, jamais au montage : un écran qui
// s'ouvre sur un accusé déjà acquis ne répond à aucun geste.
//
// Là où le formulaire reste à l'écran, la région seule suffit et ce composant
// n'a pas d'objet : le focus n'y est pas perdu.
export function PatientRegionAccuse({ visible, children }: { visible: boolean; children: ReactNode }) {
  const regionRef = useRef<HTMLDivElement>(null);
  const etaitVisible = useRef(visible);

  useEffect(() => {
    if (visible && !etaitVisible.current) regionRef.current?.focus();
    etaitVisible.current = visible;
  }, [visible]);

  return (
    <div
      ref={regionRef}
      role="status"
      tabIndex={-1}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {visible ? children : null}
    </div>
  );
}
