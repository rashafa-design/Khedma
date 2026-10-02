"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Remembers that this client has looked at a worker: once the card has been
// mostly on screen for a couple of seconds (so scrolling straight past it
// doesn't count). Renders nothing, and doesn't refresh the page - the card
// picks up its "Viewed" label the next time the list loads, so it doesn't
// change under the client's eyes while they're reading it.
export function ViewTracker({
  workerProfileId,
  enabled,
  children,
  className,
}: {
  workerProfileId: string;
  enabled: boolean;
  children: React.ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let recorded = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (timer || recorded) return;
          timer = setTimeout(async () => {
            recorded = true;
            observer.disconnect();
            const supabase = createClient();
            // ignoreDuplicates keeps the original first-viewed date.
            await supabase
              .from("worker_views")
              .upsert(
                { worker_profile_id: workerProfileId },
                { onConflict: "client_id,worker_profile_id", ignoreDuplicates: true }
              );
          }, 2000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [workerProfileId, enabled]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
