import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Package,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { usePublishing } from "@/hooks/usePublishing";
import { useNavigate } from "react-router-dom";

type Step = "select" | "configure" | "validate" | "review" | "publish";

export default function Publishing() {
  const navigate = useNavigate();
  const {
    products,
    stores,
    isLoading,
    isSubmitting,
    validateProducts,
    submitForPublishing,
  } = usePublishing();

  const [step, setStep] = useState<Step>("select");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [targetStore, setTargetStore] = useState<string>("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [validationResults, setValidationResults] = useState<
    Array<{
      productId: string;
      platform: string;
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>
  >([]);

  const steps: { key: Step; label: string }[] = [
    { key: "select", label: "Select Products" },
    { key: "configure", label: "Configure" },
    { key: "validate", label: "Validate" },
    { key: "review", label: "Review" },
    { key: "publish", label: "Publish" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const selectedStore = stores.find((s) => s.id === targetStore);

  const nextStep = () => {
    if (step === "configure") {
      // Run validation when moving from configure to validate
      const results = validateProducts(selectedProducts, targetStore);
      const resultsWithIds = selectedProducts.map((productId, index) => ({
        productId,
        ...results[index],
      }));
      setValidationResults(resultsWithIds);
    }

    const next = steps[currentStepIndex + 1];
    if (next) setStep(next.key);
  };

  const prevStep = () => {
    const prev = steps[currentStepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const handleSubmit = async () => {
    const success = await submitForPublishing(
      selectedProducts,
      targetStore,
      requiresApproval
    );
    if (success) {
      navigate(requiresApproval ? "/approvals" : "/jobs");
    }
  };

  const allValid = validationResults.every((r) => r.isValid);
  const hasWarnings = validationResults.some((r) => r.warnings.length > 0);

  const getProductById = (id: string) => products.find((p) => p.id === id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

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
              {step === "validate" && "Platform-specific validation results."}
              {step === "review" && "Review your publishing request before submission."}
              {step === "publish" && "Confirm and submit for publishing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select Products */}
            {step === "select" && (
              <div className="space-y-3">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No products available.</p>
                    <p className="text-sm">Add products to get started.</p>
                  </div>
                ) : (
                  products.map((product) => (
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
                      <div className="text-right">
                        <p className="font-medium">
                          {product.currency || "$"}
                          {product.base_price?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
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

            {/* Validate */}
            {step === "validate" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {allValid ? (
                    <Badge variant="success" className="text-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      All validations passed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-sm">
                      <XCircle className="w-4 h-4 mr-1" />
                      Some validations failed
                    </Badge>
                  )}
                  {hasWarnings && (
                    <Badge variant="warning" className="text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Warnings present
                    </Badge>
                  )}
                </div>

                {validationResults.map((result) => {
                  const product = getProductById(result.productId);
                  return (
                    <div
                      key={result.productId}
                      className={`p-4 rounded-lg border ${
                        result.isValid
                          ? "border-success/30 bg-success/5"
                          : "border-destructive/30 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="font-medium">{product?.title}</span>
                        </div>
                        <Badge variant="secondary">{result.platform}</Badge>
                      </div>

                      {result.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.errors.map((error, i) => (
                            <p key={i} className="text-sm text-destructive flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {error}
                            </p>
                          ))}
                        </div>
                      )}

                      {result.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.warnings.map((warning, i) => (
                            <p key={i} className="text-sm text-warning flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}

                      {result.isValid && result.warnings.length === 0 && (
                        <p className="text-sm text-success mt-1">
                          Ready for {result.platform}
                        </p>
                      )}
                    </div>
                  );
                })}
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
                      {selectedStore?.name || "Not selected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStore?.platform}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Products:</p>
                  {products
                    .filter((p) => selectedProducts.includes(p.id))
                    .map((product) => {
                      const validation = validationResults.find(
                        (v) => v.productId === product.id
                      );
                      return (
                        <div key={product.id} className="flex items-center gap-2 text-sm">
                          {validation?.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span>{product.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {product.sku}
                          </Badge>
                          <span className="text-muted-foreground ml-auto">
                            {product.currency || "$"}
                            {product.base_price?.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Publishing Options:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Approval required:{" "}
                      <span className="text-foreground">
                        {requiresApproval ? "Yes" : "No"}
                      </span>
                    </li>
                    <li>
                      • Validation status:{" "}
                      <span className={allValid ? "text-success" : "text-destructive"}>
                        {allValid ? "All passed" : "Some failed"}
                      </span>
                    </li>
                  </ul>
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

                {!allValid && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-left max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Validation Errors</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Some products have validation errors. You can still submit,
                          but they may fail during publishing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="glow"
                  size="lg"
                  className="mt-4"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      {requiresApproval ? "Submit for Approval" : "Publish Now"}
                    </>
                  )}
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
            disabled={currentStepIndex === 0 || isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {step !== "publish" && (
            <Button
              onClick={nextStep}
              disabled={
                (step === "select" && selectedProducts.length === 0) ||
                (step === "configure" && !targetStore) ||
                isSubmitting
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
