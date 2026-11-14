// Date de publication d'un document TRUST, en lettres (Q1 b du prototype
// PAT-6, [[D-481]] complément DOC-11) : « publiée le 12 novembre 2026 ».
//
// `publieLe` est une DATE CALENDAIRE AAAA-MM-JJ, pas un horodatage : elle se
// lit en UTC, où `Date.UTC` la pose, pour ne jamais glisser d'un jour selon le
// fuseau du navigateur. Seul l'affichage change : la valeur canonique, les
// versions et les textes signés restent intacts. Une valeur qui n'a pas cette
// forme s'affiche telle quelle plutôt que de produire une date fausse.
//
// Module pur : il sert un composant client et une page client.

const FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function datePublicationEnLettres(publieLe: string): string {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publieLe);
  if (!morceaux) return publieLe;
  const [annee, mois, jour] = [Number(morceaux[1]), Number(morceaux[2]), Number(morceaux[3])];
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  // 2026-02-30 deviendrait le 2 mars : une date impossible reste écrite telle quelle.
  if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) {
    return publieLe;
  }
  return FORMAT.format(date);
}
