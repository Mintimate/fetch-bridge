-- Keep D1's CURRENT_TIMESTAMP rows sortable with Prisma's ISO-8601 DateTime rows.
UPDATE "DownloadLog"
SET "createdAt" = replace("createdAt", ' ', 'T') || '.000Z'
WHERE length("createdAt") = 19
  AND substr("createdAt", 11, 1) = ' ';
