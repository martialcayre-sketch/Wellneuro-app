import {
  BookOpen,
  CalendarDays,
  ContactRound,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Mail,
  MailPlus,
  MessageCircle,
  NotebookPen,
  Stethoscope,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CleEntree } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { TRAIT_ICONE } from '@/components/ui/icone';

/*
 * LES ICÔNES DE « MON ESPACE » ([[D-460]] §2). Une icône désigne un rayon, jamais
 * un état ni une valeur ([[D-333]]) ; toujours à côté de son libellé, jamais seule
 * ([[D-444]] §3). Même icône que le rail praticien quand le rayon est le même
 * (`SidebarRail.tsx`), sans son thème.
 */
export const ICONES_MON_ESPACE: Readonly<Record<CleEntree | 'parcours', LucideIcon>> = {
  parcours: LayoutDashboard,
  suivi: CalendarDays,
  carnet: NotebookPen,
  bilan: FileText,
  bibliotheque: BookOpen,
  fiches: Lightbulb,
  courrierMedecin: Mail,
  courrierComplement: MailPlus,
  pourVotreMedecin: Stethoscope,
  renseignements: ContactRound,
  compteRendu: FlaskConical,
  depot: Upload,
  dossier: Users,
  echanges: MessageCircle,
};

/** 19 px à 100 %, comme le rail praticien ; en `rem`, pour suivre le confort de lecture ; trait Lien (`TRAIT_ICONE`, A5-R3). */
export function IconeMonEspace({ cle }: { cle: CleEntree | 'parcours' }) {
  const Icone = ICONES_MON_ESPACE[cle];
  return <Icone aria-hidden="true" strokeWidth={TRAIT_ICONE} className="h-[1.1875rem] w-[1.1875rem] shrink-0" />;
}
