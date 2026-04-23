const SOURCE_LABELS_ES = {
  USDA: "USDA",
  "Open Food Facts": "Open Food Facts",
  "AI estimate": "Estimacion IA",
  "Manual entry": "Carga manual",
};

const EXACT_TEXT_TRANSLATIONS_ES = {
  "Fallback Pantry": "Despensa de respaldo",
  "Chicken Breast, roasted, skinless": "Pechuga de pollo, asada, sin piel",
  "Chicken breast, sauteed, skin not eaten": "Pechuga de pollo, salteada, sin piel",
  "Chicken breast, rotisserie, skin not eaten": "Pechuga de pollo, rotiseria, sin piel",
  "Chicken, broilers or fryers, breast, meat only, cooked, roasted":
    "Pechuga de pollo, solo carne, cocida, asada",
  "White Rice, cooked": "Arroz blanco, cocido",
  "Brown Rice, cooked": "Arroz integral, cocido",
  "Rolled Oats, dry": "Avena arrollada, seca",
  "Banana, raw": "Banana, cruda",
  "Apple, raw": "Manzana, cruda",
  "Egg, whole": "Huevo entero",
  "Egg White": "Clara de huevo",
  "Salmon, cooked": "Salmon, cocido",
  "Tuna in Water": "Atun al agua",
  "Greek Yogurt, plain, nonfat": "Yogur griego, natural, descremado",
  "Milk, 2% fat": "Leche, 2% grasa",
  "Broccoli, cooked": "Brocoli, cocido",
  "Potato, baked": "Papa, al horno",
  "Sweet Potato, baked": "Batata, al horno",
  "Whole Wheat Pasta, cooked": "Pasta integral, cocida",
  "Lean Ground Beef, cooked": "Carne picada magra, cocida",
  "Avocado, raw": "Palta, cruda",
  "Almonds, raw": "Almendras, crudas",
  "Cottage Cheese, low fat": "Queso cottage, bajo en grasa",
  "Chocolate Milk": "Leche chocolatada",
  "Protein Bar": "Barra de proteina",
  "Yogurt Drink": "Bebida de yogur",
  "Sports Drink": "Bebida deportiva",
  "Recovery Shake": "Batido de recuperacion",
  "Granola Bar": "Barra de granola",
};

const REPLACEMENTS_ES = [
  [/\bchicken breast\b/gi, "pechuga de pollo"],
  [/\bchicken\b/gi, "pollo"],
  [/\bwhite rice\b/gi, "arroz blanco"],
  [/\bbrown rice\b/gi, "arroz integral"],
  [/\brolled oats\b/gi, "avena arrollada"],
  [/\boats\b/gi, "avena"],
  [/\bbanana\b/gi, "banana"],
  [/\bapple\b/gi, "manzana"],
  [/\begg white\b/gi, "clara de huevo"],
  [/\begg\b/gi, "huevo"],
  [/\bsalmon\b/gi, "salmon"],
  [/\btuna in water\b/gi, "atun al agua"],
  [/\btuna\b/gi, "atun"],
  [/\bgreek yogurt\b/gi, "yogur griego"],
  [/\byogurt drink\b/gi, "bebida de yogur"],
  [/\byogurt\b/gi, "yogur"],
  [/\bmilk\b/gi, "leche"],
  [/\bbroccoli\b/gi, "brocoli"],
  [/\bsweet potato\b/gi, "batata"],
  [/\bpotato\b/gi, "papa"],
  [/\bwhole wheat pasta\b/gi, "pasta integral"],
  [/\blean ground beef\b/gi, "carne picada magra"],
  [/\bground beef\b/gi, "carne picada"],
  [/\bavocado\b/gi, "palta"],
  [/\balmonds\b/gi, "almendras"],
  [/\bcottage cheese\b/gi, "queso cottage"],
  [/\bchocolate milk\b/gi, "leche chocolatada"],
  [/\bprotein bar\b/gi, "barra de proteina"],
  [/\bsports drink\b/gi, "bebida deportiva"],
  [/\brecovery shake\b/gi, "batido de recuperacion"],
  [/\bgranola bar\b/gi, "barra de granola"],
  [/\brotisserie\b/gi, "rotiseria"],
  [/\bskinless\b/gi, "sin piel"],
  [/\bskin not eaten\b/gi, "sin piel"],
  [/\bplain\b/gi, "natural"],
  [/\bnonfat\b/gi, "descremado"],
  [/\blow fat\b/gi, "bajo en grasa"],
  [/\bwhole\b/gi, "entero"],
  [/\braw\b/gi, "cruda"],
  [/\bcooked\b/gi, "cocido"],
  [/\broasted\b/gi, "asada"],
  [/\bgrilled\b/gi, "grillado"],
  [/\bsauteed\b/gi, "salteada"],
  [/\bbaked\b/gi, "al horno"],
  [/\bdry\b/gi, "seca"],
  [/\bmeat only\b/gi, "solo carne"],
  [/\bbroilers or fryers\b/gi, ""],
];

function normalizeSpaces(value) {
  return value
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*$/g, "")
    .trim();
}

function capitalizeFirstLetter(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function localizeNutritionSourceLabel(label, isSpanish) {
  if (!isSpanish) {
    return label || "";
  }
  return SOURCE_LABELS_ES[label] || label || "";
}

export function localizeNutritionBrand(brand, isSpanish) {
  if (!isSpanish) {
    return brand || "";
  }
  return EXACT_TEXT_TRANSLATIONS_ES[brand] || brand || "";
}

export function localizeNutritionText(value, isSpanish) {
  const text = String(value || "").trim();
  if (!isSpanish || !text) {
    return text;
  }

  if (EXACT_TEXT_TRANSLATIONS_ES[text]) {
    return EXACT_TEXT_TRANSLATIONS_ES[text];
  }

  let localized = text;
  for (const [pattern, replacement] of REPLACEMENTS_ES) {
    localized = localized.replace(pattern, replacement);
  }

  return capitalizeFirstLetter(normalizeSpaces(localized));
}
