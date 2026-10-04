import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function BlockButton({
  blockedId,
  label = "Block",
  compact = false,
}: {
  blockedId: string;
  label?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: blocked } = useQuery({
    queryKey: ["blocks", user?.id, blockedId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  if (!user || blockedId === user.id) return null;

  const toggle = async () => {
    if (!user) return;
    setBusy(true);

    try {
      if (blocked) {
        const { error } = await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", blockedId);
        if (error) throw error;
        toast.success("User unblocked");
      } else {
        const { error } = await supabase
          .from("blocks")
          .insert({ blocker_id: user.id, blocked_id: blockedId });
        if (error) throw error;
        toast.success("User blocked");
      }
      await queryClient.invalidateQueries({ queryKey: ["blocks", user.id, blockedId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update block state");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={blocked ? "secondary" : "ghost"}
      size={compact ? "icon" : "sm"}
      aria-label={label}
      className="text-muted-foreground"
      disabled={busy}
      onClick={toggle}
    >
      <Ban className="h-3.5 w-3.5" aria-hidden />
      {!compact && <span className="ml-1">{blocked ? "Blocked" : label}</span>}
    </Button>
  );
}
