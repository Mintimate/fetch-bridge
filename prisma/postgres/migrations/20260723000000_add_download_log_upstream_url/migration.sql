-- Preserve the exact upstream URL used for each relay request.
ALTER TABLE "DownloadLog" ADD COLUMN "upstreamUrl" TEXT;
