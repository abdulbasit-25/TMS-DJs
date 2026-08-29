import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_app/load-tender")({
  component: LoadTenderPage,
});

function LoadTenderPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Load Tender"
        description="Placeholder page for tendering shipments and vendor coordination."
      />

      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Package className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Coming soon</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The tendering workflow and load assignment details will be added here later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
