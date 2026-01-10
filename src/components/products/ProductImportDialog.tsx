import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileJson, FileSpreadsheet, Check, X, AlertCircle, Loader2 } from "lucide-react";
import type { TablesInsert } from "@/integrations/supabase/types";

interface ImportProduct {
  title: string;
  sku: string;
  description?: string;
  base_price?: number;
  currency?: string;
  valid: boolean;
  errors: string[];
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (products: TablesInsert<"products">[]) => Promise<void>;
  orgId: string;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImport,
  orgId,
}: ProductImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedProducts, setImportedProducts] = useState<ImportProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "json" | null>(null);

  const parseCSV = (text: string): ImportProduct[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const products: ImportProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const product: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        product[header] = values[index] || "";
      });

      const errors: string[] = [];
      if (!product.title) errors.push("Title is required");
      if (!product.sku) errors.push("SKU is required");

      products.push({
        title: product.title || "",
        sku: product.sku || "",
        description: product.description,
        base_price: product.base_price ? parseFloat(product.base_price) : undefined,
        currency: product.currency || "USD",
        valid: errors.length === 0,
        errors,
      });
    }

    return products;
  };

  const parseJSON = (text: string): ImportProduct[] => {
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      
      return items.map((item) => {
        const errors: string[] = [];
        if (!item.title) errors.push("Title is required");
        if (!item.sku) errors.push("SKU is required");

        return {
          title: item.title || "",
          sku: item.sku || "",
          description: item.description,
          base_price: item.base_price || item.price,
          currency: item.currency || "USD",
          valid: errors.length === 0,
          errors,
        };
      });
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "The file contains invalid JSON syntax.",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const text = await file.text();
    
    let products: ImportProduct[];
    if (file.name.endsWith(".csv")) {
      setFileType("csv");
      products = parseCSV(text);
    } else if (file.name.endsWith(".json")) {
      setFileType("json");
      products = parseJSON(text);
    } else {
      toast({
        title: "Unsupported format",
        description: "Please upload a CSV or JSON file.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    setImportedProducts(products);
    setIsProcessing(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    const validProducts = importedProducts.filter((p) => p.valid);
    if (validProducts.length === 0) {
      toast({
        title: "No valid products",
        description: "Please fix the errors before importing.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const productsToInsert: TablesInsert<"products">[] = validProducts.map((p) => ({
        title: p.title,
        sku: p.sku,
        description: p.description || null,
        base_price: p.base_price || null,
        currency: p.currency || "USD",
        org_id: orgId,
      }));

      await onImport(productsToInsert);
      
      toast({
        title: "Import successful",
        description: `${validProducts.length} products have been imported.`,
      });

      onOpenChange(false);
      setImportedProducts([]);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = importedProducts.filter((p) => p.valid).length;
  const invalidCount = importedProducts.filter((p) => !p.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to bulk import products.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="bg-muted">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={importedProducts.length === 0}>
              Preview ({importedProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* File upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">CSV or JSON files</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Format examples */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">CSV Format</span>
                </div>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`title,sku,base_price,description
"T-Shirt",TSHIRT-001,29.99,"Cotton tee"
"Hoodie",HOODIE-001,59.99,"Zip hoodie"`}
                </pre>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">JSON Format</span>
                </div>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`[
  {"title": "T-Shirt", "sku": "TSHIRT-001", "base_price": 29.99},
  {"title": "Hoodie", "sku": "HOODIE-001", "base_price": 59.99}
]`}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4">
              <Badge variant="success" className="gap-1">
                <Check className="w-3 h-3" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="w-3 h-3" />
                  {invalidCount} invalid
                </Badge>
              )}
              {fileType && (
                <Badge variant="outline" className="gap-1">
                  {fileType === "csv" ? (
                    <FileSpreadsheet className="w-3 h-3" />
                  ) : (
                    <FileJson className="w-3 h-3" />
                  )}
                  {fileType.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Products table */}
            <ScrollArea className="h-[300px] rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {product.valid ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.title || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.sku || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {product.base_price ? `$${product.base_price.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {product.errors.length > 0 && (
                          <span className="text-xs text-destructive">
                            {product.errors.join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setImportedProducts([]);
          }}>
            Cancel
          </Button>
          <Button
            variant="glow"
            onClick={handleImport}
            disabled={validCount === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validCount} Products`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
