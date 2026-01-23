const { ApplicationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    await validateAgenda(data, null);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    // Récupérer l'entrée existante pour connaître l'état actuel
    const existing = await strapi.entityService.findOne(
      "api::agenda.agenda",
      where.id,
      {
        populate: ["spectacle", "plus_qu_une_piece"],
      }
    );
    await validateAgenda(data, existing);
  },
};

async function validateAgenda(data, existing) {
  // DEBUG: Afficher les données reçues
  console.log("=== VALIDATION AGENDA ===");
  console.log("data.type:", data.type);
  console.log("data.spectacle:", JSON.stringify(data.spectacle, null, 2));
  console.log("data.plus_qu_une_piece:", JSON.stringify(data.plus_qu_une_piece, null, 2));
  console.log("existing:", JSON.stringify(existing, null, 2));
  console.log("=========================");

  // Si pas de type, laisser Strapi gérer la validation
  if (!data.type) {
    return;
  }

  // Fonction helper pour vérifier si un champ de relation est vide
  const isEmpty = (value) => {
    // Si c'est null, undefined ou chaîne vide
    if (value === null || value === undefined || value === "") {
      return true;
    }

    // Si c'est un objet avec connect/disconnect (format Strapi pour les relations)
    if (typeof value === "object" && value !== null) {
      // Si connect et disconnect sont tous les deux vides, la relation est vide
      if (Array.isArray(value.connect) && Array.isArray(value.disconnect)) {
        return value.connect.length === 0 && value.disconnect.length === 0;
      }
      // Si c'est juste un objet vide
      if (Object.keys(value).length === 0) {
        return true;
      }
    }

    return false;
  };

  // Fonction pour calculer l'état FINAL d'un champ après les modifications
  const getFinalState = (dataValue, existingValue) => {
    // Si c'est un objet, vérifier les différents formats possibles
    if (dataValue && typeof dataValue === "object") {
      // Format "set" - définit directement la relation
      if ("set" in dataValue && Array.isArray(dataValue.set)) {
        return dataValue.set.length > 0 ? "filled" : "empty";
      }

      // Format "connect" ou "connect/disconnect" - modification incrémentale
      if ("connect" in dataValue) {
        // Si on connecte quelque chose, c'est rempli
        if (Array.isArray(dataValue.connect) && dataValue.connect.length > 0) {
          return "filled";
        }
        // Si on déconnecte quelque chose, c'est vide
        if (
          Array.isArray(dataValue.disconnect) &&
          dataValue.disconnect.length > 0
        ) {
          return "empty";
        }
        // Si connect et disconnect sont vides, garder l'état existant
        if (
          Array.isArray(dataValue.connect) &&
          Array.isArray(dataValue.disconnect) &&
          dataValue.connect.length === 0 &&
          dataValue.disconnect.length === 0
        ) {
          return existingValue ? "filled" : "empty";
        }
      }
    }

    // Si c'est un nombre (ID direct), c'est rempli
    if (typeof dataValue === "number") {
      return "filled";
    }

    // Si c'est null/undefined dans data, garder l'état existant
    if (dataValue === null || dataValue === undefined) {
      return existingValue ? "filled" : "empty";
    }

    return "empty";
  };

  // Calculer l'état final des champs après modification
  const spectacleFinalState = getFinalState(
    data.spectacle,
    existing?.spectacle
  );
  const plusQuUnePieceFinalState = getFinalState(
    data.plus_qu_une_piece,
    existing?.plus_qu_une_piece
  );

  // Validation stricte selon le type
  if (data.type === "spectacle") {
    // Vérifier que spectacle sera rempli après sauvegarde
    if (spectacleFinalState !== "filled") {
      throw new ApplicationError(
        "Un spectacle doit être sélectionné quand le type est 'spectacle'"
      );
    }
    // Vérifier que plus_qu_une_piece sera VIDE après sauvegarde
    if (plusQuUnePieceFinalState === "filled") {
      throw new ApplicationError(
        "Le champ 'Plus qu'une pièce' doit être vide quand le type est 'spectacle'"
      );
    }
  } else if (data.type === "plus_qu_une_piece") {
    // Vérifier que plus_qu_une_piece sera rempli après sauvegarde
    if (plusQuUnePieceFinalState !== "filled") {
      throw new ApplicationError(
        "Une 'plus qu'une pièce' doit être sélectionnée quand le type est 'plus_qu_une_piece'"
      );
    }
    // Vérifier que spectacle sera VIDE après sauvegarde
    if (spectacleFinalState === "filled") {
      throw new ApplicationError(
        "Le champ 'Spectacle' doit être vide quand le type est 'plus_qu_une_piece'"
      );
    }
  }
}
