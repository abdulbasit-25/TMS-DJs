import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_app/straight-bill-of-lading")({
  component: StraightBillOfLadingPage,
});

function StraightBillOfLadingPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Straight Bill of Lading"
        description="Placeholder page for the bill of lading workflow."
      />

      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Coming soon</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              This page is intentionally kept as a placeholder until the final BOL form and PDF
              template are ready.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
