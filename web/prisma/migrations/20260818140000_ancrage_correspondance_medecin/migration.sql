-- LOT-06 : ancrage de provenance sur les correspondances médecin ([[D-073]]).
--
-- Le courrier biologie est dérivé d'une table clinique SIGNÉE : son bloc porte
-- déjà `provenance.ancrageHash` (le SHA du périmètre) et sa version. Rien ne
-- pouvait les recevoir en base — seul `texte` était persisté —, si bien que
-- consigner la lettre revenait à perdre ce par quoi elle s'explique (`DC-34`).
--
-- POURQUOI DES COLONNES ET NON UNE LIGNE DE TEXTE : une ancre en prose n'est
-- vérifiable par personne. Le programme D-063→D-067 a rendu la péremption
-- DÉTECTABLE en posant des SHA qu'une garde compare ; une ancre noyée dans le
-- corps de la lettre serait à la traçabilité ce qu'un JSDoc est à une garde.
--
-- NULLABLES À DESSEIN : une correspondance saisie à la main n'est dérivée
-- d'aucune table, et lui inventer une ancre serait pire que l'absence
-- (`DC-24` : une donnée absente n'est ni zéro ni normale).
ALTER TABLE "correspondances_medecin"
  ADD COLUMN "ancrage_sha256" TEXT,
  ADD COLUMN "ancrage_version" TEXT;

-- Les deux termes voyagent ENSEMBLE ou pas du tout : un SHA sans version ne se
-- rattache à aucune table, une version sans SHA n'atteste aucun contenu. Une
-- moitié d'ancre donnerait l'apparence de la traçabilité sans la fournir.
ALTER TABLE "correspondances_medecin"
  ADD CONSTRAINT "c3_correspondance_ancrage_complet_check"
    CHECK (("ancrage_sha256" IS NULL) = ("ancrage_version" IS NULL));

-- Borne technique : un SHA-256 en hexadécimal fait 64 caractères. Aucune
-- sémantique clinique — elle refuse une valeur qui ne serait pas un SHA.
ALTER TABLE "correspondances_medecin"
  ADD CONSTRAINT "c3_correspondance_ancrage_sha_longueur_check"
    CHECK ("ancrage_sha256" IS NULL OR char_length("ancrage_sha256") = 64);
