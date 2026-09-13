import { FilDuJour } from '@/components/fil/FilDuJour';
import { MeteoAdhesionAside } from '@/components/fil/MeteoAdhesionAside';
import { AgendasEnCoursAside } from '@/components/agenda-sommeil/AgendasEnCoursAside';
import { InboxQuestionnaires } from '@/components/fil/InboxQuestionnaires';
import { FileEnvoiAside } from '@/components/fil/FileEnvoiAside';
import { CorrespondanceRecente } from '@/components/fil/CorrespondanceRecente';
import { NouveauxPatientsAside } from '@/components/fil/NouveauxPatientsAside';

// Accueil praticien = le Fil du jour, conforme à la maquette de référence
// « WellNeuro 5.0 — La Spirale » (artifact canonique) : eyebrow daté
// « interface ambiante », H1 « Le Fil du jour », timeline des cartes, colonne
// latérale de TRAVAIL — Météo d'adhésion, correspondance récente (campagne
// accueil-observatoire LOT-02). L'encart « Principe 5.0 » est retiré (décision
// propriétaire 2026-07-23 : l'aside sert le travail, le manifeste vit dans la
// vitrine). Les métriques « le cabinet en un coup d'œil » restent retirées
// (décision propriétaire 2026-07-22) ; la liste complète des patients reste sur
// /dashboard/patients.
//
// TROIS CHANGEMENTS DE DISPOSITION (demande propriétaire 2026-09-13 : « la
// position de l'inbox demande trop de défilement ; limiter au maximum les
// scrollings »).
//
// 1. L'INBOX QUESTIONNAIRES QUITTE LE RAIL POUR LA COLONNE PRINCIPALE, en
//    tête, au-dessus de la timeline. Elle était quatrième d'une pile de six
//    panneaux de ~150 px dans 300 px de large : lire les réponses en attente
//    demandait de défiler, alors que c'est le premier geste de la journée.
//    Elle reste UNE LIGNE PAR PATIENT et garde son tiroir de lecture — la
//    décision du 2026-07-23 (inbox groupée plutôt que cartes « Reçu » fondues
//    dans le Fil) n'est pas rouverte : seule sa PLACE change.
//
// 2. UN PANNEAU VIDE NE COÛTE PLUS QU'UNE LIGNE. Voir `PanneauRail` : titre et
//    état restent visibles, le texte complet est à un clic, et une lecture en
//    échec ne se replie jamais.
//
// 3. LE RAIL SE DÉDOUBLE AU-DELÀ DE 1536 px. Sur les écrans larges — celui du
//    praticien fait 3420 px — la colonne principale restait vide pendant que
//    le rail débordait vers le bas. Deux colonnes de 300 px y divisent la
//    hauteur du rail par deux, sans rien retirer ni rien cacher ; sous `2xl`
//    les deux groupes se réempilent dans l'ordre d'aujourd'hui.
export default function DashboardPage() {
  const dateDuJour = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête maquette : eyebrow daté + titre + sous-titre. Resserré (mt-0.5,
          text-sm) : chaque pixel repris ici est un pixel de travail gagné. */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          {dateDuJour} · Interface ambiante
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Le Fil du jour
        </h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          L&apos;interface anticipe l&apos;étape au lieu d&apos;attendre la navigation —
          chaque carte dit pourquoi elle apparaît maintenant, tout reste refusable,
          le rail reste intégral.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Colonne de lecture : ce qui est arrivé, puis ce qui vient. */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <InboxQuestionnaires />
          <FilDuJour />
        </div>

        {/* Rail de travail (maquette + décisions 2026-07-23) : chaque panneau se
            charge indépendamment et affiche ses propres états — rien n'est
            inventé, rien ne bloque le Fil. Un seul repère `aside` pour les deux
            groupes : la lecture d'écran n'entend pas deux rails. */}
        <aside
          aria-label="Rail de travail"
          className="flex flex-col gap-4 lg:w-[300px] lg:shrink-0 2xl:w-[616px] 2xl:flex-row"
        >
          <div className="flex flex-col gap-4 2xl:min-w-0 2xl:flex-1">
            {/* En tête de colonne : un dossier neuf resté derrière l'une des
                trois portes de mise en service (e-mail d'accès, entrée au
                portail, pack de base) n'apparaît nulle part ailleurs — il
                ressemble partout à un dossier qui commence. */}
            <NouveauxPatientsAside />
            <MeteoAdhesionAside />
            <AgendasEnCoursAside />
          </div>

          {/* Réception en colonne principale, envoi ici : deux blocs
              volontairement séparés (arbitrage propriétaire 2026-08-09 — fusion
              écartée, deux logiques distinctes). */}
          <div className="flex flex-col gap-4 2xl:min-w-0 2xl:flex-1">
            <FileEnvoiAside />
            <CorrespondanceRecente />
          </div>
        </aside>
      </div>
    </div>
  );
}
