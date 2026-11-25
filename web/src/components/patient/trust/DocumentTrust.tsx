import { Fragment } from 'react';
import type { VersionDocumentTrust } from '@/lib/trust/types';
import { datePublicationEnLettres } from '@/lib/trust/datePublication';
import { PatientVolet } from '@/components/patient/ui/PatientVolet';

/**
 * Rendu de la version canonique HTML d'un document d'information TRUST.
 * Deux modes : blocs (lecture continue) ou accordéons natifs <details> (volets à chevron, PatientVolet)
 * (accessibles clavier/lecteur d'écran sans JS). La version et la date de
 * publication sont toujours visibles (LOT-02, « version visible »).
 */
export function DocumentTrust({
  document,
  accordeons = false,
  partiesDepliees = [],
  versionAilleurs = false,
}: {
  document: VersionDocumentTrust;
  accordeons?: boolean;
  /** Parties d'un document assemblé dont les accordéons s'ouvrent d'office. */
  partiesDepliees?: readonly string[];
  /**
   * La page rend elle-même `LigneVersion` hors du document (consentement de
   * l'entrée, planche PAT-2) : la version reste visible, à un autre endroit.
   */
  versionAilleurs?: boolean;
}) {
  return (
    <div className="space-y-3 [overflow-wrap:anywhere] max-[319px]:hyphens-auto">
      {!versionAilleurs && <LigneVersion document={document} />}
      {document.sections.map((section, index) => {
        // Un document assemblé ([[D-292]]) titre chaque partie à sa première section.
        const titrePartie =
          section.partie && section.partie !== document.sections[index - 1]?.partie ? (
            <h3 className="pt-2 text-base font-semibold text-foreground">{section.partie}</h3>
          ) : null;
        const cle = `${section.partie ?? ''}|${section.titre}`;
        const bloc = accordeons ? (
          <PatientVolet
            titre={section.titre}
            open={section.partie !== undefined && partiesDepliees.includes(section.partie)}
          >
            <SectionCorps section={section} />
          </PatientVolet>
        ) : (
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-1">{section.titre}</h4>
            <SectionCorps section={section} />
          </section>
        );
        return (
          <Fragment key={cle}>
            {titrePartie}
            {bloc}
          </Fragment>
        );
      })}
    </div>
  );
}

/** La ligne « Version … — publiée le … » d'un document TRUST. */
export function LigneVersion({ document, className = '' }: { document: VersionDocumentTrust; className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`.trim()}>
      Version {document.version} — publiée le {datePublicationEnLettres(document.publieLe)}
    </p>
  );
}

function SectionCorps({ section }: { section: VersionDocumentTrust['sections'][number] }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
      {section.paragraphes.map(paragraphe => (
        <p key={paragraphe.slice(0, 40)}>{paragraphe}</p>
      ))}
      {section.points && (
        <ul className="list-disc list-inside space-y-1">
          {section.points.map(point => (
            <li key={point.slice(0, 40)}>{point}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
