-- Fase 3: crea una única opción canónica EXTRA por cada registro legacy de Extra.
-- No asigna categorías: los extras existentes no contienen esa información.
INSERT INTO "MenuOption" (
    "id", "name", "description", "price", "kind", "active",
    "legacyExtraId", "createdAt", "updatedAt"
)
SELECT
    'legacy_extra_' || extra."id",
    extra."name",
    NULL,
    extra."price",
    'EXTRA',
    extra."active",
    extra."id",
    extra."createdAt",
    extra."updatedAt"
FROM "Extra" AS extra
WHERE NOT EXISTS (
    SELECT 1
    FROM "MenuOption" AS option
    WHERE option."legacyExtraId" = extra."id"
);
