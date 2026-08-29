import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_app/carrier-rate-confirmation")({
  component: CarrierRateConfirmationPage,
});

function CarrierRateConfirmationPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Carrier Rate Confirmation"
        description="Placeholder page for carrier pricing approval and confirmation."
      />

      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Truck className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Coming soon</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              This module will be used for confirming carrier rates and terms before dispatch.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
