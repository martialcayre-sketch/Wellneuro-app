'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import type { FilApiResponse } from '@/app/api/praticien/fil/route';
import type { CorrespondanceCompteurApiResponse } from '@/app/api/praticien/correspondance-medecin/recentes/compteur/route';
import {
  DESTINATIONS_PRATICIEN,
  GROUPES_NAVIGATION,
  destinationsDuGroupe,
  estActive,
  type DestinationPraticien,
} from '@/lib/navigation/destinationsPraticien';
import { EmpreinteMarque } from '@/components/ui/EmpreinteMarque';
import { TRAIT_ICONE } from '@/components/ui/icone';

// Rail praticien (refonte Lien, lot PRA-1). Ses entrées viennent de la
// déclaration unique des destinations ([[D-485]]) ; ses quatre groupes sont
// ceux de [[D-487]]. Le rail n'en recopie aucune.
//
// `compteur: 'fil'` affiche le compteur RÉEL de cartes du Fil.
// `compteur: 'correspondance'` désigne une TÂCHE, pas un historique : le nombre
// de dossiers dont le DERNIER échange consigné est un envoi remontant à plus de
// sept jours — on a écrit, rien n'est revenu ([[D-210]]). Le délai n'est pas
// fixé ici : il vient du serveur, et l'écran le rapporte. Aucun chiffre
// inventé ; rien en cas d'erreur réseau.

const LIBELLE_FIL_INCOMPLET = 'comptes rendus biologiques à lire non vérifiés';

/** Une commande du pied de rail : réduire, étendre, masquer ([[D-486]] §2). */
export type CommandeRail = {
  /**
   * Identifiant STABLE de la commande, clé React comprise : le libellé change
   * au basculement « Réduire » / « Étendre », et une clé tirée du texte
   * remontait le bouton, dont le focus clavier se perdait (revue CodeRabbit
   * de #1997).
   */
  id: string;
  libelle: string;
  icone: LucideIcon;
  onClick: () => void;
  ariaExpanded?: boolean;
  refBouton?: Ref<HTMLButtonElement>;
};

interface SidebarRailProps {
  /** Rail réduit en icônes ([[D-486]] §1). */
  collapsed: boolean;
  onNavigate?: () => void;
  /** Affiche la marque Empreinte en tête (le tiroir tablette garde son titre). */
  brand?: boolean;
  /** Commandes du pied de rail ; le tiroir tablette n'en a pas. */
  commandes?: CommandeRail[];
}

/*
 * RAIL RÉDUIT : chaque entrée garde son nom accessible ; son libellé paraît au
 * survol, au focus clavier et pendant l'appui du doigt, et Échap le masque
 * jusqu'au prochain mouvement du pointeur ou du focus ([[D-486]] §2 ; artefact
 * « Wellneuro Lien — Empreinte », LienShell). L'infobulle est décorative
 * (`aria-hidden`) : le nom vient de `aria-label`.
 */
const CLASSES_INFOBULLE =
  'pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-sm font-medium text-surface shadow-pop group-hover/entree:block group-focus-visible/entree:block group-data-[appui=oui]/entree:block group-data-[infobulles=non]/rail:!hidden';

export function SidebarRail({ collapsed, onNavigate, brand = false, commandes }: SidebarRailProps) {
  const pathname = usePathname();
  // Compteur réel du Fil — même API que l'écran ; silence en cas d'échec.
  const [nbCartesFil, setNbCartesFil] = useState<number | null>(null);
  /**
   * Le Fil a été servi SANS ses comptes rendus biologiques à lire, dont le
   * calcul a échoué ([[D-268]] §6). Le rail le DIT — un rail sans compteur
   * ressemblerait à un Fil vide (contre-revue Codex, #1347).
   */
  const [filIncomplet, setFilIncomplet] = useState(false);
  // Dossiers où l'on a écrit au médecin et où rien n'est revenu — silence en
  // cas d'échec. Le délai vient du serveur : l'écran le dit, il ne le fixe pas.
  const [nbCorrespondance, setNbCorrespondance] = useState<number | null>(null);
  const [delaiAttente, setDelaiAttente] = useState<number | null>(null);
  // Infobulles du rail réduit : masquées par Échap, entrée pressée au doigt.
  const [infobullesMasquees, setInfobullesMasquees] = useState(false);
  const [entreeAppuyee, setEntreeAppuyee] = useState<string | null>(null);
  const minuteurAppui = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch('/api/praticien/fil')
      .then(r => r.json())
      .then((d: FilApiResponse) => {
        // Un Fil dont les comptes rendus à lire n'ont pas pu être calculés
        // ([[D-268]] §6) SOUS-COMPTERAIT : pas de compteur plutôt qu'un faux.
        if (!vivant || d.unavailable) return;
        if (d.lecturesBiologieIndisponibles) setFilIncomplet(true);
        else if (Array.isArray(d.cartes)) setNbCartesFil(d.cartes.length);
      })
      .catch(() => {});
    // Le COMPTEUR, pas la liste : le rail n'a jamais affiché les lignes, et les
    // demander faisait résoudre cinq noms de patients à chaque montage.
    fetch('/api/praticien/correspondance-medecin/recentes/compteur')
      .then(r => r.json())
      .then((d: CorrespondanceCompteurApiResponse) => {
        if (!vivant || d.unavailable) return;
        setNbCorrespondance(d.nbEnAttente);
        setDelaiAttente(d.delaiJours);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    if (!collapsed) return undefined;
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setInfobullesMasquees(true);
        setEntreeAppuyee(null);
      }
    }
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [collapsed]);

  useEffect(
    () => () => {
      if (minuteurAppui.current) clearTimeout(minuteurAppui.current);
    },
    [],
  );

  const compteurDe = (compteur: DestinationPraticien['compteur']): number | null =>
    compteur === 'fil' ? nbCartesFil : compteur === 'correspondance' ? nbCorrespondance : null;

  /**
   * UN NOMBRE NU N'EST PAS UN SIGNAL. La pastille ne portait aucun énoncé : ni
   * à l'œil, ni pour un lecteur d'écran, qui annonçait « Correspondance 2 ».
   * Ce libellé dit ce que le chiffre compte, et le délai vient du serveur —
   * l'écran le rapporte, il ne le fixe pas.
   */
  const libelleCompteur = (compteur: DestinationPraticien['compteur'], nombre: number): string => {
    if (compteur === 'fil') return `${nombre} carte${nombre > 1 ? 's' : ''} au Fil du jour`;
    const dossiers = `${nombre} dossier${nombre > 1 ? 's' : ''}`;
    return delaiAttente === null
      ? `${dossiers} sans réponse du médecin`
      : `${dossiers} sans réponse du médecin depuis plus de ${delaiAttente} jours`;
  };

  function appuiDebut(cle: string, evenement: React.PointerEvent) {
    if (!collapsed || evenement.pointerType !== 'touch') return;
    if (minuteurAppui.current) clearTimeout(minuteurAppui.current);
    setInfobullesMasquees(false);
    setEntreeAppuyee(cle);
  }

  function appuiFin() {
    if (minuteurAppui.current) clearTimeout(minuteurAppui.current);
    minuteurAppui.current = setTimeout(() => setEntreeAppuyee(null), 1500);
  }

  const reveiller = () => {
    if (infobullesMasquees) setInfobullesMasquees(false);
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="group/rail flex flex-1 flex-col"
      data-infobulles={infobullesMasquees ? 'non' : undefined}
      onPointerMove={reveiller}
      onFocus={reveiller}
    >
      {brand && (
        // Marque Empreinte sur la nuit du rail (A5-R3) ; réduite, le symbole
        // seul, le nom restant lisible par les lecteurs d'écran.
        <div className={`flex items-center pb-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
          <EmpreinteMarque tone="night" size={collapsed ? 36 : 40} compact={collapsed} />
        </div>
      )}

      <div className="space-y-1">
        {GROUPES_NAVIGATION.map((groupe, indexGroupe) => {
          const destinations = destinationsDuGroupe(groupe.id, DESTINATIONS_PRATICIEN);
          if (destinations.length === 0) return null;
          return (
            <div key={groupe.id}>
              {collapsed ? (
                indexGroupe > 0 && <div className="my-2 border-t border-rail-border" aria-hidden="true" />
              ) : (
                <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-[.08em] text-rail-muted-foreground">
                  {groupe.intertitre}
                </p>
              )}
              {destinations.map(destination => {
                const active = estActive(destination, pathname);
                const Icone = destination.icone;
                const nombre = compteurDe(destination.compteur);
                const filSignale = destination.compteur === 'fil' && filIncomplet;

                return (
                  <Link
                    key={destination.href}
                    href={destination.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    aria-label={
                      collapsed
                        ? filSignale
                          ? `${destination.libelle} — ${LIBELLE_FIL_INCOMPLET}`
                          : destination.libelle
                        : undefined
                    }
                    data-appui={entreeAppuyee === destination.href ? 'oui' : undefined}
                    onPointerDown={evenement => appuiDebut(destination.href, evenement)}
                    onPointerUp={appuiFin}
                    onPointerCancel={appuiFin}
                    // Entrée active ([[D-488]], artefact Lien) : fond `rail-surface`
                    // et barre de 3 px `rail-accent` (champagne, 5,8:1 sur
                    // rail-surface), au lieu d'un aplat.
                    className={`group/entree relative flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm transition duration-fast ease-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-rail-surface font-semibold text-rail-foreground shadow-[inset_3px_0_0_var(--rail-accent)]'
                        : 'text-rail-muted-foreground hover:bg-rail-surface hover:text-rail-foreground'
                    }`}
                  >
                    <Icone aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} className="shrink-0" />
                    {/* Le libellé passe à la ligne plutôt que d'être coupé :
                        « Compléments alimentaires » dépasse les 252 px du rail
                        déplié, et « Compléments aliment… » ne disait plus le
                        rayon (H43). */}
                    {collapsed ? (
                      <span aria-hidden="true" className={CLASSES_INFOBULLE}>
                        {destination.libelle}
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1 break-words leading-snug">{destination.libelle}</span>
                    )}
                    {filSignale && (
                      // Le « ! » double le texte, jamais la couleur seule (A5-R1),
                      // et se voit rail réduit comme déplié.
                      <span
                        className="shrink-0 rounded-full border border-rail-accent px-1.5 py-0.5 font-mono text-2xs font-semibold text-rail-accent"
                        title={LIBELLE_FIL_INCOMPLET}
                        data-testid="fil-incomplet"
                      >
                        <span aria-hidden="true">!</span>
                        {!collapsed && <span className="sr-only">{LIBELLE_FIL_INCOMPLET}</span>}
                      </span>
                    )}
                    {!collapsed && nombre !== null && nombre > 0 && (
                      <span
                        className="shrink-0 rounded-full border border-rail-border px-2 py-0.5 font-mono text-2xs font-semibold text-rail-accent"
                        title={libelleCompteur(destination.compteur, nombre)}
                      >
                        <span aria-hidden="true">{nombre}</span>
                        <span className="sr-only">{libelleCompteur(destination.compteur, nombre)}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {commandes && commandes.length > 0 && (
        // Pied de rail ([[D-486]] §2) : chaque commande nomme sa cible.
        <div className="mt-auto space-y-1 border-t border-rail-border pt-3">
          {commandes.map(commande => {
            const Icone = commande.icone;
            return (
              <button
                key={commande.id}
                ref={commande.refBouton}
                type="button"
                onClick={commande.onClick}
                aria-expanded={commande.ariaExpanded}
                aria-label={collapsed ? commande.libelle : undefined}
                data-appui={entreeAppuyee === commande.id ? 'oui' : undefined}
                onPointerDown={evenement => appuiDebut(commande.id, evenement)}
                onPointerUp={appuiFin}
                onPointerCancel={appuiFin}
                className={`group/entree relative flex min-h-11 w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-sm text-rail-muted-foreground transition duration-fast ease-lien hover:bg-rail-surface hover:text-rail-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <Icone aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} className="shrink-0" />
                {collapsed ? (
                  <span aria-hidden="true" className={CLASSES_INFOBULLE}>
                    {commande.libelle}
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 break-words leading-snug">{commande.libelle}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
