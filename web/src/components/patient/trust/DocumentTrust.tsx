import type { VersionDocumentTrust } from '@/lib/trust/types';

/**
 * Rendu de la version canonique HTML d'un document d'information TRUST.
 * Deux modes : blocs (lecture continue) ou accordéons natifs <details>
 * (accessibles clavier/lecteur d'écran sans JS). La version et la date de
 * publication sont toujours visibles (LOT-02, « version visible »).
 */
export function DocumentTrust({
  document,
  accordeons = false,
}: {
  document: VersionDocumentTrust;
  accordeons?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Version {document.version} — publiée le {document.publieLe}
      </p>
      {document.sections.map(section =>
        accordeons ? (
          <details key={section.titre} className="rounded-lg border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
              {section.titre}
            </summary>
            <div className="px-4 pb-4">
              <SectionCorps section={section} />
            </div>
          </details>
        ) : (
          <section key={section.titre}>
            <h4 className="text-sm font-semibold text-foreground mb-1">{section.titre}</h4>
            <SectionCorps section={section} />
          </section>
        ),
      )}
    </div>
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
