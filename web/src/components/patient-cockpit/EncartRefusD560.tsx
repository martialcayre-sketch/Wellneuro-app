// L'encart des refus de [[D-560]] §4, porté par chaque surface de son §1.
// Le texte vit dans `lib/doctrine/encartD560.ts`, gardé par un banc.

import { PUCES_ENCART_D560, TITRE_ENCART_D560 } from '@/lib/doctrine/encartD560';

export function EncartRefusD560() {
  return (
    <aside
      aria-labelledby="encart-refus-d560-titre"
      data-encart-d560=""
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h3 id="encart-refus-d560-titre" className="text-sm font-semibold text-foreground">
        {TITRE_ENCART_D560}
      </h3>
      <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
        {PUCES_ENCART_D560.map((puce) => (
          <li key={puce}>– {puce}</li>
        ))}
      </ul>
    </aside>
  );
}
