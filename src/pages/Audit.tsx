import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Download,
  FileText,
  User,
  Database,
  Settings,
  Shield,
  Lock,
  AlertCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const resourceIcons: Record<string, typeof FileText> = {
  listing: FileText,
  approval: Settings,
  product: Database,
  store: Database,
  session: User,
  job: Settings,
  budget: Shield,
  org: Database,
  plugin: Settings,
};

const actionColors: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  create: "success",
  approve: "success",
  insert: "success",
  update: "warning",
  connect: "default",
  delete: "destructive",
  reject: "destructive",
  login: "secondary",
  logout: "secondary",
  signup: "success",
  claim: "default",
  complete: "success",
  fail: "destructive",
};

const soc2TagColors: Record<string, string> = {
  data_modification: "bg-warning/20 text-warning border-warning/30",
  access_control: "bg-primary/20 text-primary border-primary/30",
  configuration_change: "bg-info/20 text-info border-info/30",
  authentication: "bg-success/20 text-success border-success/30",
  sensitive: "bg-destructive/20 text-destructive border-destructive/30",
  audit: "bg-secondary text-secondary-foreground border-border",
  data_access: "bg-muted text-muted-foreground border-border",
};

export default function Audit() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [soc2TagFilter, setSoc2TagFilter] = useState("all");

  const { logs, isLoading, filterOptions, refetch } = useAuditLogs({
    search,
    actionFilter,
    resourceTypeFilter,
    soc2TagFilter,
    limit: 100,
  });

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Action", "Resource Type", "Resource ID", "User ID", "SOC2 Tags", "Metadata"],
      ...logs.map((log) => [
        log.created_at,
        log.action,
        log.resource_type,
        log.resource_id || "",
        log.user_id || "",
        (log.soc2_tags || []).join("; "),
        JSON.stringify(log.metadata || {}),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Audit logs exported");
  };

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* SOC2 Compliance Banner */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">SOC2 Compliant Audit Trail</p>
              <p className="text-sm text-muted-foreground mt-1">
                All logs are append-only, immutable, and retained for 90 days. Each entry is tagged
                with relevant SOC2 categories for compliance reporting.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {filterOptions.actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {filterOptions.resourceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={soc2TagFilter} onValueChange={setSoc2TagFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="SOC2 Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All SOC2 Tags</SelectItem>
                    {filterOptions.soc2Tags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No audit logs found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Timestamp</TableHead>
                      <TableHead className="font-semibold">Action</TableHead>
                      <TableHead className="font-semibold">Resource</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">SOC2 Tags</TableHead>
                      <TableHead className="font-semibold w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const Icon = resourceIcons[log.resource_type] || FileText;
                      return (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs text-muted-foreground cursor-help">
                                  {formatDistanceToNow(new Date(log.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {format(new Date(log.created_at), "PPpp")}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={actionColors[log.action] || "secondary"}
                              className="capitalize"
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="capitalize">{log.resource_type}</span>
                              {log.resource_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {log.resource_id.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.user_id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-sm font-mono">
                                  {log.user_id.slice(0, 8)}...
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                              {(log.soc2_tags || []).slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className={`text-xs ${soc2TagColors[tag] || ""}`}
                                >
                                  {tag.replace(/_/g, " ")}
                                </Badge>
                              ))}
                              {(log.soc2_tags || []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(log.soc2_tags || []).length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <LogDetailDialog log={log} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function LogDetailDialog({ log }: { log: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Immutable record - ID: {log.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Timestamp</p>
              <p className="font-mono text-sm">
                {format(new Date(log.created_at), "PPpp")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Action</p>
              <Badge variant={actionColors[log.action] || "secondary"} className="capitalize">
                {log.action}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resource Type</p>
              <p className="capitalize">{log.resource_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resource ID</p>
              <p className="font-mono text-sm">{log.resource_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{log.user_id || "System"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">IP Address</p>
              <p className="font-mono text-sm">{String(log.ip_address) || "N/A"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">SOC2 Tags</p>
            <div className="flex gap-1 flex-wrap">
              {(log.soc2_tags || []).map((tag: string) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-xs ${soc2TagColors[tag] || ""}`}
                >
                  {tag.replace(/_/g, " ")}
                </Badge>
              ))}
              {(!log.soc2_tags || log.soc2_tags.length === 0) && (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
          </div>

          {log.old_value && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Previous Value</p>
              <pre className="p-3 rounded-lg bg-muted/50 font-mono text-xs overflow-auto max-h-32">
                {JSON.stringify(log.old_value, null, 2)}
              </pre>
            </div>
          )}

          {log.new_value && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">New Value</p>
              <pre className="p-3 rounded-lg bg-muted/50 font-mono text-xs overflow-auto max-h-32">
                {JSON.stringify(log.new_value, null, 2)}
              </pre>
            </div>
          )}

          {log.metadata && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Metadata</p>
              <pre className="p-3 rounded-lg bg-muted/50 font-mono text-xs overflow-auto max-h-32">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
