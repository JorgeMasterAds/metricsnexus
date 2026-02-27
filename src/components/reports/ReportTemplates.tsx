import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3 } from "lucide-react";
import ReportTemplateLowTicket from "./ReportTemplateLowTicket";

export default function ReportTemplates() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="lowticket" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="lowticket" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            LowTicket / Lançamento Pago
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lowticket" className="mt-4">
          <ReportTemplateLowTicket />
        </TabsContent>
      </Tabs>
    </div>
  );
}
