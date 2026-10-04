import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type ItemType = "experience" | "destination" | "business";

export function useSaved(itemType: ItemType, itemId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["saves", user?.id, itemType, itemId];
  const { data: saved } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saves" as never)
        .select("id")
        .eq("user_id", user!.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .maybeSingle();
      return !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("signin");
      if (saved) {
        const { error } = await supabase
          .from("saves" as never)
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", itemType)
          .eq("item_id", itemId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("saves" as never)
        .insert({ user_id: user.id, item_type: itemType, item_id: itemId } as never);
      if (error) throw error;
      return true;
    },
    onSuccess: (now) => {
      queryClient.setQueryData(key, now);
      queryClient.invalidateQueries({ queryKey: ["saves", user?.id] });
    },
    onError: () => toast.error("Could not update your saved list"),
  });
  return { saved: !!saved, toggle, signedIn: !!user };
}

export function SaveButton({
  itemType,
  itemId,
  variant = "secondary",
  size,
  reminder,
  className,
}: {
  itemType: ItemType;
  itemId: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Shows "Remind me" wording (upcoming experiences). */
  reminder?: boolean;
  className?: string;
}) {
  const { saved, toggle, signedIn } = useSaved(itemType, itemId);
  const navigate = useNavigate();
  const Icon = reminder ? (saved ? BellRing : Bell) : saved ? BookmarkCheck : Bookmark;
  const label = reminder ? (saved ? "Reminder set" : "Remind me") : saved ? "Saved" : "Save";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          navigate({ to: "/auth" });
          return;
        }
        toggle.mutate(undefined, {
          onSuccess: (now) =>
            toast.success(
              now
                ? reminder
                  ? "We'll keep this in My BukaLive"
                  : "Saved to My BukaLive"
                : "Removed",
            ),
        });
      }}
    >
      <Icon className="mr-1.5 h-4 w-4" aria-hidden /> {label}
    </Button>
  );
}
