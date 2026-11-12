"use server";

import { revalidatePath } from "next/cache";

/** Drops cached server and client-router data for pages that list recordings. */
export async function revalidateRecordings(): Promise<void> {
  revalidatePath("/recordings");
  revalidatePath("/dashboard");
}
