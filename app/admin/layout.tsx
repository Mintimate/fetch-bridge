import { notFound } from "next/navigation";

/** The former common admin path intentionally returns 404. */
export default function RetiredAdminRoute() {
  notFound();
}
