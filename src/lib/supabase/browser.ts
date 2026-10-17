"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

// For uploads that are too large to pass through the website's server (report PDFs).
// Uses the signed-in person's session; the database and storage rules still decide what is allowed.
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
