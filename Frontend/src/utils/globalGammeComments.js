import { gammesAPI, generalCommentsAPI, projectsAPI } from "../api/index";

const normalizeGammeName = (value) => {
  return String(value || "").trim().toLowerCase();
};

export const getGlobalGammeIdsByName = async ({ gammeId, gammeName }) => {
  const normalizedName = normalizeGammeName(gammeName);

  if (!normalizedName) return [gammeId].filter(Boolean);

  try {
    const projects = await projectsAPI.list();
    const gammesByProject = await Promise.all(
      (projects || []).map((project) =>
        gammesAPI.listByProjet(project.id).catch(() => [])
      )
    );

    const matchingIds = gammesByProject
      .flat()
      .filter((gamme) => normalizeGammeName(gamme.nom_gamme) === normalizedName)
      .map((gamme) => gamme.id);

    return Array.from(new Set([gammeId, ...matchingIds].filter(Boolean)));
  } catch (error) {
    console.error("Erreur chargement gammes liées:", error);
    return [gammeId].filter(Boolean);
  }
};

export const listGlobalGeneralComments = async ({ gammeId, gammeName, type }) => {
  const relatedGammeIds = await getGlobalGammeIdsByName({ gammeId, gammeName });
  const groupedComments = await Promise.all(
    relatedGammeIds.map((relatedGammeId) =>
      generalCommentsAPI
        .list({
          gammeId: relatedGammeId,
          type,
        })
        .then((comments) =>
          (comments || []).map((comment) => ({
            ...comment,
            source_gamme_id: relatedGammeId,
          }))
        )
        .catch(() => [])
    )
  );

  return Array.from(
    new Map(
      groupedComments.flat().map((comment, index) => [
        comment.id || `${comment.source_gamme_id}-${comment.date || index}`,
        comment,
      ])
    ).values()
  );
};
