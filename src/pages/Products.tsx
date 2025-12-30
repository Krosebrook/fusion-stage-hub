import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Upload, Filter, MoreHorizontal, Image } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  sku: string;
  title: string;
  price: number;
  inventory: number;
  status: "active" | "draft" | "archived";
  stores: string[];
  thumbnail?: string;
}

const mockProducts: Product[] = [
  { id: "1", sku: "TSHIRT-001", title: "Vintage Band T-Shirt", price: 29.99, inventory: 150, status: "active", stores: ["Shopify", "Etsy"] },
  { id: "2", sku: "CANVAS-001", title: "Abstract Canvas Print 24x36", price: 89.99, inventory: 45, status: "active", stores: ["Shopify", "Printify"] },
  { id: "3", sku: "MUG-001", title: "Ceramic Coffee Mug - Mountains", price: 18.99, inventory: 200, status: "active", stores: ["Etsy", "Printify"] },
  { id: "4", sku: "EBOOK-001", title: "Digital Marketing Guide", price: 24.99, inventory: 999, status: "active", stores: ["Gumroad"] },
  { id: "5", sku: "POSTER-001", title: "Minimalist Poster Set", price: 34.99, inventory: 0, status: "draft", stores: [] },
  { id: "6", sku: "HOODIE-001", title: "Premium Zip Hoodie", price: 59.99, inventory: 75, status: "active", stores: ["Shopify", "Amazon SC"] },
];

const statusColors = {
  active: "success" as const,
  draft: "secondary" as const,
  archived: "destructive" as const,
};

export default function Products() {
  const [products] = useState<Product[]>(mockProducts);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

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
            <Button variant="glow">
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
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === filteredProducts.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">Price</TableHead>
                    <TableHead className="font-semibold">Inventory</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Stores</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/20">
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
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
                      <TableCell className="font-mono">${product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={product.inventory === 0 ? "text-destructive" : ""}>
                          {product.inventory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[product.status]} className="capitalize">
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {product.stores.length > 0 ? (
                            product.stores.map((store) => (
                              <Badge key={store} variant="outline" className="text-xs">
                                {store}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>Publish</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
