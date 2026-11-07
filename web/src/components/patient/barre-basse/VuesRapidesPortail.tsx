'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { entreesServies } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { useEtatMenuPortail } from '@/components/patient/menu/MenuMonEspace';
import { elementActif } from '@/components/patient/menu/activationMenu';
import { railSurLeChemin } from '@/components/patient/rail/cheminRail';
import { casesServies } from './BarreBasse';
import { NOM_BARRE_BASSE } from './textesBarreBasse';

/*
 * LES ONGLETS DE L'EN-TÊTE ([[D-460]] §3), analogue patient des Vues rapides du
 * praticien : dès 1 024 px, les cases de la barre basse, mêmes libellés, mêmes
 * cibles, même garde. Un raccourci, pas une navigation de plus : la barre est
 * masquée à cette largeur, et le rail garde toute la liste. Hors du questionnaire
 * en cours, comme le rail.
 */
const CLASSE = 'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-muted-foreground hover:text-foreground';
const CLASSE_ACTIVE = 'inline-flex min-h-11 items-center rounded-full bg-primary/10 px-4 text-sm font-semibold text-primary';

export function VuesRapidesPortail() {
  const etat = useEtatMenuPortail();
  const pathname = usePathname() ?? '';
  if (!etat?.actif || !etat.icones || !etat.token || !railSurLeChemin(pathname, etat.token)) return null;

  const servies = entreesServies(etat.etats, { bilanConsultable: etat.bilanConsultable });
  const actif = elementActif(etat.segment, servies);

  return (
    <nav aria-label={NOM_BARRE_BASSE} className="hidden lg:block print:hidden">
      <ul className="flex items-center gap-1">
        {casesServies(etat.token, servies).map(une => (
          <li key={une.cle}>
            <Link
              href={une.href}
              aria-current={actif === une.cle ? 'page' : undefined}
              className={actif === une.cle ? CLASSE_ACTIVE : CLASSE}
            >
              {une.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
