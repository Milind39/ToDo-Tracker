// utils/getAppOptions;

import { supabase } from "@/lib/supabase";

export async function getAppOptions() {
  const { data, error } = await supabase.from("app_registry").select("*");
  if (error) {
    console.error("Error fetching apps", error);
    return [];
  }
  return data;
}
