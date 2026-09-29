'use client';

import { ConsignerLecturePortail } from '@/components/patient/ConsignerLecturePortail';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { dateDeRemise, mentionsDeLaFiche, MENTION_IA, titreDeLaFiche, TITRE_ESPACE } from './textesFiches';
import { useFichesRemises } from './useFichesRemises';

// La page d'UNE fiche remise ([[D-251]] §8, lot 10). Le texte vient de la route
// du portail, qui l'a rejoué par les contrôles au moment de servir (§6).
//
// L'IDENTIFIANT VIENT DE L'URL, MAIS IL NE DÉSIGNE QUE CE QUE LA ROUTE SERT. Une
// remise remplacée par une plus récente, ou d'un autre dossier, n'est pas dans
// la liste servie : la page le dit, et ne montre rien.
//
// LA LECTURE N'EST CONSIGNÉE QU'UNE FOIS LE TEXTE AFFICHÉ. Posée à côté de
// l'écran, la trace partait sur sa propre requête : une panne passagère de
// celle-ci laissait « Réessayer » à l'écran et retirait pourtant la tâche du
// fil. Montée ici, sous le texte, elle ne part que si ce texte est là.
//
// Le texte est inséré comme enfant React, jamais comme HTML.

export function FicheRemiseLecture({ token, idRemise }: { token: string; idRemise: string }) {
  const { etat, recharger } = useFichesRemises(token);

  if (etat.statut === 'chargement') {
    return (
      <PatientCard padding="sm">
        <p className="text-sm text-muted-foreground">Chargement de la fiche…</p>
      </PatientCard>
    );
  }

  if (etat.statut === 'erreur') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : recharger} />
      </PatientCard>
    );
  }

  const fiche = etat.fiches.find(f => f.idRemise === idRemise);
  if (!fiche) {
    return (
      <PatientCard padding="sm">
        <p className="text-base text-foreground">Cette fiche n’est pas disponible.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Retrouvez les fiches de votre praticien dans « {TITRE_ESPACE} ».
        </p>
      </PatientCard>
    );
  }

  const date = dateDeRemise(fiche.remiseLe);
  const mentions = mentionsDeLaFiche(fiche);

  return (
    <article className="space-y-6">
      <PatientCard>
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-foreground">{titreDeLaFiche(fiche)}</h1>
          {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
          {mentions.map(mention => (
            <p key={mention} className="mt-3 text-base text-foreground">{mention}</p>
          ))}
        </header>

        {fiche.contenu && (
          <>
            {fiche.contenu.precautions.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Précautions</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {fiche.contenu.precautions.map((precaution, i) => (
                    <li key={i} className="whitespace-pre-line text-base leading-relaxed text-foreground">{precaution}</li>
                  ))}
                </ul>
              </section>
            )}
            {fiche.contenu.sections.map((section, i) => (
              <section key={i} className="mt-8">
                <h2 className="text-lg font-semibold text-foreground">{section.titre}</h2>
                {section.paragraphes.map((paragraphe, j) => (
                  <p key={j} className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground">{paragraphe}</p>
                ))}
              </section>
            ))}
            <footer className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
              <p>{MENTION_IA}</p>
            </footer>
          </>
        )}
      </PatientCard>

      {fiche.contenu && (
        <div className="print:hidden">
          <PatientButton variant="ghost" onClick={() => window.print()}>
            Imprimer ou enregistrer en PDF
          </PatientButton>
          <ConsignerLecturePortail espece="fiche_assiette" idObjet={fiche.idRemise} />
        </div>
      )}
    </article>
  );
}
