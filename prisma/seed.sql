INSERT INTO "Source" (
  "id",
  "name",
  "baseUrl",
  "enabled",
  "timeoutMs",
  "headersJson",
  "createdAt",
  "updatedAt"
)
VALUES (
  'seed-source-mozilla',
  'Mozilla Releases',
  'https://ftp.mozilla.org',
  1,
  30000,
  '{}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Route" (
  "id",
  "pathPrefix",
  "targetPath",
  "enabled",
  "isPublic",
  "name",
  "description",
  "sourceId",
  "createdAt",
  "updatedAt"
)
SELECT
  'seed-route-firefox',
  '/firefox',
  '/pub/fenix',
  1,
  1,
  'Firefox Android',
  'Mozilla 官方 Android 版本下载',
  "id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Source"
WHERE "name" = 'Mozilla Releases'
ON CONFLICT ("pathPrefix") DO NOTHING;
