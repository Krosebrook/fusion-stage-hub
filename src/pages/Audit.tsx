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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Filter, FileText, User, Database, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  user: string;
  metadata: Record<string, unknown>;
  soc2Tags: string[];
  createdAt: Date;
}

const mockLogs: AuditLog[] = [
  { id: "1", action: "create", resourceType: "listing", resourceId: "lst-001", user: "john@example.com", metadata: { store: "Etsy" }, soc2Tags: ["data_modification"], createdAt: new Date(Date.now() - 1000 * 60 * 5) },
  { id: "2", action: "approve", resourceType: "approval", resourceId: "apr-001", user: "admin@example.com", metadata: { decision: "approved" }, soc2Tags: ["access_control"], createdAt: new Date(Date.now() - 1000 * 60 * 15) },
  { id: "3", action: "update", resourceType: "product", resourceId: "prd-001", user: "jane@example.com", metadata: { fields: ["price", "title"] }, soc2Tags: ["data_modification"], createdAt: new Date(Date.now() - 1000 * 60 * 30) },
  { id: "4", action: "connect", resourceType: "store", resourceId: "str-001", user: "john@example.com", metadata: { platform: "Shopify" }, soc2Tags: ["configuration_change"], createdAt: new Date(Date.now() - 1000 * 60 * 60) },
  { id: "5", action: "delete", resourceType: "product", resourceId: "prd-002", user: "admin@example.com", metadata: { reason: "discontinued" }, soc2Tags: ["data_modification", "sensitive"], createdAt: new Date(Date.now() - 1000 * 60 * 120) },
  { id: "6", action: "login", resourceType: "session", resourceId: "ses-001", user: "jane@example.com", metadata: { ip: "192.168.1.1" }, soc2Tags: ["authentication"], createdAt: new Date(Date.now() - 1000 * 60 * 180) },
];

const resourceIcons: Record<string, typeof FileText> = {
  listing: FileText,
  approval: Settings,
  product: Database,
  store: Database,
  session: User,
};

const actionColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  create: "success",
  approve: "success",
  update: "warning",
  connect: "default",
  delete: "destructive",
  login: "secondary",
};

export default function Audit() {
  const [logs] = useState<AuditLog[]>(mockLogs);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.includes(search.toLowerCase()) ||
      log.resourceType.includes(search.toLowerCase()) ||
      log.user.includes(search.toLowerCase());
    const matchesFilter = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
            <p className="text-muted-foreground">
              Immutable record of all actions for SOC2 compliance.
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export Logs
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Resource</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">SOC2 Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const Icon = resourceIcons[log.resourceType] || FileText;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionColors[log.action]} className="capitalize">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="capitalize">{log.resourceType}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.resourceId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm">{log.user}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {log.soc2Tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
