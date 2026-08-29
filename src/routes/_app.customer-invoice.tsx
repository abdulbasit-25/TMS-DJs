import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReceiptText } from "lucide-react";

export const Route = createFileRoute("/_app/customer-invoice")({
  component: CustomerInvoicePage,
});

function CustomerInvoicePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Invoice"
        description="Placeholder page for customer invoicing and billing details."
      />

      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ReceiptText className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Coming soon</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              This page will eventually hold the customer invoice builder and payment details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
