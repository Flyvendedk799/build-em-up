import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Hook to read a content block by key. Returns the JSON value or fallback. */
export function useContentBlock<T = any>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let alive = true;
    supabase.from("content_blocks").select("value").eq("key", key).maybeSingle()
      .then(({ data }) => { if (alive && data?.value != null) setValue(data.value as T); });
    return () => { alive = false; };
  }, [key]);
  return value;
}
