import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const REASONS = [
  "Misleading or fake listing",
  "Harmful or unsafe content",
  "Harassment or hate",
  "Spam or scam",
  "Other",
];

type Props = {
  itemType: "experience" | "chat_message" | "user" | "business";
  itemId: string;
  label?: string;
  compact?: boolean;
};

export function ReportButton({ itemType, itemId, label = "Report", compact }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("Misleading or fake listing");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      item_type: itemType,
      item_id: itemId,
      reason,
      details: details.slice(0, 1000),
    });
    setBusy(false);
    if (error) { toast.error("Report not sent"); return; }
    toast.success("Thanks — our team will review this.");
    setOpen(false);
    setDetails("");
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          aria-label={label}
          className="text-muted-foreground"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden />
          {!compact && <span className="ml-1">{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this</DialogTitle>
          <DialogDescription>Reports go to the BukaLive moderation team.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {REASONS.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={`r-${r}`} />
              <Label htmlFor={`r-${r}`}>{r}</Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea
          placeholder="Anything else we should know? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
        />
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
