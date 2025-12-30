import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Rocket, AlertTriangle, CheckCircle2, Package } from "lucide-react";

type Step = "select" | "configure" | "review" | "publish";

interface SelectedProduct {
  id: string;
  title: string;
  sku: string;
}

const mockProducts: SelectedProduct[] = [
  { id: "1", title: "Vintage Band T-Shirt", sku: "TSHIRT-001" },
  { id: "2", title: "Abstract Canvas Print", sku: "CANVAS-001" },
  { id: "3", title: "Ceramic Coffee Mug", sku: "MUG-001" },
];

const stores = [
  { id: "1", name: "Shopify Main", platform: "Shopify" },
  { id: "2", name: "Etsy Vintage", platform: "Etsy" },
  { id: "3", name: "Printify POD", platform: "Printify" },
];

export default function Publishing() {
  const [step, setStep] = useState<Step>("select");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [targetStore, setTargetStore] = useState<string>("");
  const [requiresApproval, setRequiresApproval] = useState(true);

  const steps: { key: Step; label: string }[] = [
    { key: "select", label: "Select Products" },
    { key: "configure", label: "Configure" },
    { key: "review", label: "Review" },
    { key: "publish", label: "Publish" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const nextStep = () => {
    const next = steps[currentStepIndex + 1];
    if (next) setStep(next.key);
  };

  const prevStep = () => {
    const prev = steps[currentStepIndex - 1];
    if (prev) setStep(prev.key);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Publishing Wizard</h2>
          <p className="text-muted-foreground">
            Stage and publish products to connected stores with approval workflows.
          </p>
        </div>

        {/* Progress */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((s, i) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-2 ${
                    i <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= currentStepIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>{steps[currentStepIndex].label}</CardTitle>
            <CardDescription>
              {step === "select" && "Choose products to publish to a store."}
              {step === "configure" && "Configure publishing options and target store."}
              {step === "review" && "Review your publishing request before submission."}
              {step === "publish" && "Confirm and submit for publishing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select Products */}
            {step === "select" && (
              <div className="space-y-3">
                {mockProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedProducts.includes(product.id)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                    onClick={() =>
                      setSelectedProducts((prev) =>
                        prev.includes(product.id)
                          ? prev.filter((id) => id !== product.id)
                          : [...prev, product.id]
                      )
                    }
                  >
                    <Checkbox checked={selectedProducts.includes(product.id)} />
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Configure */}
            {step === "configure" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Target Store</Label>
                  <Select value={targetStore} onValueChange={setTargetStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name} ({store.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approval"
                    checked={requiresApproval}
                    onCheckedChange={(checked) => setRequiresApproval(!!checked)}
                  />
                  <Label htmlFor="approval">Require approval before publishing</Label>
                </div>

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Staged Publishing</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Changes will be staged and require approval before going live.
                        This ensures all modifications are reviewed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review */}
            {step === "review" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="text-2xl font-bold">{selectedProducts.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Target Store</p>
                    <p className="text-lg font-medium">
                      {stores.find((s) => s.id === targetStore)?.name || "Not selected"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Products:</p>
                  {mockProducts
                    .filter((p) => selectedProducts.includes(p.id))
                    .map((product) => (
                      <div key={product.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>{product.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {product.sku}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Publish */}
            {step === "publish" && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">Ready to Publish</p>
                  <p className="text-muted-foreground">
                    {requiresApproval
                      ? "Your publishing request will be sent for approval."
                      : "Your products will be published immediately."}
                  </p>
                </div>
                <Button variant="glow" size="lg" className="mt-4">
                  <Rocket className="w-4 h-4 mr-2" />
                  {requiresApproval ? "Submit for Approval" : "Publish Now"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {step !== "publish" && (
            <Button
              onClick={nextStep}
              disabled={
                (step === "select" && selectedProducts.length === 0) ||
                (step === "configure" && !targetStore)
              }
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
