import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SharedViewManager from "@/components/SharedViewManager";

interface ShareReportButtonProps {
  size?: "default" | "sm" | "icon";
}

export default function ShareReportButton({ size = "default" }: ShareReportButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5">
          <Share2 className="h-4 w-4" />
          {size !== "icon" && <span className="hidden sm:inline">Compartilhar</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Relatório</DialogTitle>
        </DialogHeader>
        <SharedViewManager />
      </DialogContent>
    </Dialog>
  );
}
