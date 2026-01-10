import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, Plus, Upload, Filter, MoreHorizontal, Image, ChevronDown, Loader2, Package } from "lucide-react";
import { useProducts, ProductWithDetails } from "@/hooks/useProducts";

export default function Products() {
  const { products, isLoading, createProduct, updateProduct, deleteProduct, createVariant, deleteVariant } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    sku: "",
    description: "",
    base_price: "",
    org_id: "",
  });
  const [variantData, setVariantData] = useState({
    name: "",
    sku: "",
    price: "",
    inventory_quantity: "",
  });

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedProducts((prev) =>
      prev.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id)
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.sku) return;
    
    await createProduct({
      title: formData.title,
      sku: formData.sku,
      description: formData.description || null,
      base_price: formData.base_price ? parseFloat(formData.base_price) : null,
      org_id: formData.org_id || products[0]?.org_id || "",
    });
    
    setIsCreateOpen(false);
    setFormData({ title: "", sku: "", description: "", base_price: "", org_id: "" });
  };

  const handleEdit = async () => {
    if (!selectedProduct) return;
    
    await updateProduct(selectedProduct.id, {
      title: formData.title,
      sku: formData.sku,
      description: formData.description || null,
      base_price: formData.base_price ? parseFloat(formData.base_price) : null,
    });
    
    setIsEditOpen(false);
    setSelectedProduct(null);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    await deleteProduct(selectedProduct.id);
    setIsDeleteOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateVariant = async () => {
    if (!selectedProduct || !variantData.name || !variantData.sku) return;
    
    await createVariant({
      product_id: selectedProduct.id,
      name: variantData.name,
      sku: variantData.sku,
      price: variantData.price ? parseFloat(variantData.price) : null,
      inventory_quantity: variantData.inventory_quantity ? parseInt(variantData.inventory_quantity) : 0,
    });
    
    setIsVariantOpen(false);
    setVariantData({ name: "", sku: "", price: "", inventory_quantity: "" });
  };

  const openEdit = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      sku: product.sku,
      description: product.description || "",
      base_price: product.base_price?.toString() || "",
      org_id: product.org_id,
    });
    setIsEditOpen(true);
  };

  const openDelete = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const openVariantDialog = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setIsVariantOpen(true);
  };

  const getTotalInventory = (product: ProductWithDetails) => {
    return product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
  };

  const getListedStores = (product: ProductWithDetails) => {
    const storeIds = [...new Set(product.listings.map((l) => l.store_id))];
    return storeIds.length;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">
              Manage your product catalog across all connected stores.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
            <Button variant="glow" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </Button>
            </div>
            {selectedProducts.length > 0 && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">
                  {selectedProducts.length} selected
                </span>
                <Button variant="outline" size="sm">Bulk Edit</Button>
                <Button variant="outline" size="sm">Publish to Store</Button>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first product to get started.
                </p>
                <Button variant="glow" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">SKU</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Inventory</TableHead>
                      <TableHead className="font-semibold">Variants</TableHead>
                      <TableHead className="font-semibold">Stores</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <Collapsible key={product.id} asChild open={expandedProducts.has(product.id)}>
                        <>
                          <TableRow className="hover:bg-muted/20">
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={() => toggleProduct(product.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleExpanded(product.id)}
                                  disabled={product.variants.length === 0}
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform ${
                                      expandedProducts.has(product.id) ? "rotate-180" : ""
                                    } ${product.variants.length === 0 ? "opacity-30" : ""}`}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  <Image className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="font-medium">{product.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                            <TableCell className="font-mono">
                              ${product.base_price?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell>
                              <span className={getTotalInventory(product) === 0 ? "text-destructive" : ""}>
                                {getTotalInventory(product)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.variants.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getListedStores(product)}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(product)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVariantDialog(product)}>
                                    Add Variant
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>Publish</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => openDelete(product)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <>
                              {product.variants.map((variant) => (
                                <TableRow key={variant.id} className="bg-muted/10">
                                  <TableCell></TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="pl-16">
                                    <span className="text-muted-foreground">↳</span>{" "}
                                    {variant.name}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">
                                    {variant.sku}
                                  </TableCell>
                                  <TableCell className="font-mono text-muted-foreground">
                                    ${variant.price?.toFixed(2) || "0.00"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {variant.inventory_quantity || 0}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell></TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => deleteVariant(variant.id)}
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product in your catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="Product title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData((f) => ({ ...f, sku: e.target.value }))}
                placeholder="PROD-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData((f) => ({ ...f, base_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Product description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleCreate}>
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData((f) => ({ ...f, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Base Price</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData((f) => ({ ...f, base_price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <Dialog open={isVariantOpen} onOpenChange={setIsVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
            <DialogDescription>
              Add a variant to {selectedProduct?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variant-name">Variant Name</Label>
              <Input
                id="variant-name"
                value={variantData.name}
                onChange={(e) => setVariantData((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g., Large / Blue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-sku">SKU</Label>
              <Input
                id="variant-sku"
                value={variantData.sku}
                onChange={(e) => setVariantData((v) => ({ ...v, sku: e.target.value }))}
                placeholder="PROD-001-LG-BLU"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-price">Price</Label>
                <Input
                  id="variant-price"
                  type="number"
                  step="0.01"
                  value={variantData.price}
                  onChange={(e) => setVariantData((v) => ({ ...v, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variant-inventory">Inventory</Label>
                <Input
                  id="variant-inventory"
                  type="number"
                  value={variantData.inventory_quantity}
                  onChange={(e) => setVariantData((v) => ({ ...v, inventory_quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleCreateVariant}>
              Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.title}"? This action
              cannot be undone and will also remove all variants and listings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
