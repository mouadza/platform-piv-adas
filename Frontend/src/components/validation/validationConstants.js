export const ROW_BG = {
  ev: "#87CEFA",
  beige: "#F5F5DC",
  salmon: "#F4B084",
  green: "#A9D08E",
  grey: "#D9D9D9",
};

export const ROW_BORDER = {
  ev: "#5AAFC4",
  beige: "#DEDAD0",
  salmon: "#D89060",
  green: "#88B86E",
  grey: "#BEBEBE",
};

export const COTATION = {
  A_coter: {
    square: "#111827",
    bg: "#F8FAFC",
    text: "#111827",
    border: "#111827",
    label: "A coter",
  },
  OK: {
    square: "#2E7D32",
    bg: "#E8F5E9",
    text: "#1B5E20",
    border: "#A5D6A7",
    label: "OK",
  },
  NOK_mineur: {
    square: "#F9A825",
    bg: "#FFFDE7",
    text: "#E65100",
    border: "#FFE082",
    label: "NOK Mineur",
  },
  NOK: {
    square: "#C62828",
    bg: "#FFEBEE",
    text: "#B71C1C",
    border: "#EF9A9A",
    label: "NOK",
  },
  Non_coté: {
    square: "#6B7280",
    bg: "#F3F4F6",
    text: "#374151",
    border: "#D1D5DB",
    label: "Non coté",
  },
};

export const COTATION_OPTIONS = [
  "A_coter",
  "OK",
  "NOK_mineur",
  "NOK",
  "Non_coté",
];

export const COMMENT_FIELDS = [
  "Commentaire Résultats",
  "Commentaires Résultats",
  "Commentaire (Résultats)",
  "Commentaires (Résultats)",
];

export const ETAT_FIELDS = ["ETAT", "Etat", "État"];

/**
 * Colonnes de résultat mesuré uniquement.
 * Tu peux garder cette constante si tu l'utilises ailleurs.
 */
export const MEASURED_RESULT_FIELDS = [
  "Résultat Mesuré (Résultats)",
  "Résultat mesuré (Résultats)",
  "Resultat Mesure (Resultats)",
  "Résultat mesuré",
  "Résultat Mesuré",
];

/**
 * Colonnes où tu veux afficher le dernier commentaire
 * + bouton pour voir/ajouter/modifier/supprimer les commentaires.
 *
 * Ça inclut :
 * - Résultat attendu
 * - Résultat mesuré
 */
export const RESULT_COMMENT_FIELDS = [
  // Résultat attendu
  "Résultat Attendu",
  "Résultat attendu",
  "Résultat Attendu (Résultats)",
  "Résultat attendu (Résultats)",
  "Resultat Attendu",
  "Resultat attendu",
  "Resultat Attendu (Resultats)",
  "Resultat attendu (Resultats)",

  // Résultat mesuré
  "Résultat Mesuré",
  "Résultat mesuré",
  "Résultat Mesuré (Résultats)",
  "Résultat mesuré (Résultats)",
  "Resultat Mesure",
  "Resultat mesure",
  "Resultat Mesure (Resultats)",
  "Resultat mesure (Resultats)",
];

export const isEtatField = (field) => ETAT_FIELDS.includes(field);

export const isMeasuredResultField = (field) =>
  MEASURED_RESULT_FIELDS.includes(field);

export const isResultCommentField = (field) =>
  RESULT_COMMENT_FIELDS.includes(field);
