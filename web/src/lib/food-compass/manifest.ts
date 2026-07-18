export const C5_PRACTITIONER_MANIFEST_VERSION = 'c5-practitioner-foods-manifest-v1' as const;

export const C5_PRACTITIONER_FOODS = [
  { foodRef: '26034', label: 'Sardine' },
  { foodRef: '26051', label: 'Maquereau' },
  { foodRef: '17270', label: "Huile d’olive vierge extra" },
  { foodRef: '17130', label: 'Huile de colza' },
  { foodRef: '20360', label: 'Lentilles' },
  { foodRef: '20507', label: 'Pois chiches' },
  { foodRef: '15005', label: 'Noix' },
  { foodRef: '32140', label: 'Flocons d’avoine' },
  { foodRef: '7110', label: 'Pain complet' },
  { foodRef: '20351', label: 'Brocoli' },
  { foodRef: '20027', label: 'Épinards' },
  { foodRef: '13028', label: 'Myrtille' },
] as const;

// SHA-256 de la représentation canonique { version, foods }. Cette empreinte
// versionne le sous-ensemble praticien sans coupler le module client à node:crypto.
export const C5_PRACTITIONER_MANIFEST_HASH = '6d6969c0e80955c9fb2ae1c609e2a5df8bc33f8b846738ac3ed468ca4750022b' as const;
