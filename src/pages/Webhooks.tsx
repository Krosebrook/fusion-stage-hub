import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebhookEvents, type WebhookEventWithStore } from "@/hooks/useWebhookEvents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, 
  Webhook, 
  RefreshCcw, 
  Play, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type WebhookStatus = Database["public"]["Enums"]["webhook_status"];

const statusConfig: Record<WebhookStatus, { label: string; icon: React.ElementType; className: string }> = {
  received: {
    label: "Received",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  processing: {
    label: "Processing",
    icon: RefreshCcw,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  processed: {
    label: "Processed",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export default function Webhooks() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventWithStore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    events,
    loading,
    fetchEvents,
    replayEvent,
    deleteEvent,
  } = useWebhookEvents(orgId);

  useEffect(() => {
    async function fetchOrg() {
      if (!user) return;

      const { data } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setOrgId(data.org_id);
      }
    }

    fetchOrg();
  }, [user]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.external_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.store?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = events.reduce(
    (acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const handleViewEvent = (event: WebhookEventWithStore) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhook Events</h1>
            <p className="text-muted-foreground">
              View and manage incoming webhook events from connected stores
            </p>
          </div>
          <Button onClick={() => fetchEvents()} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Webhook className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{statusCounts.total || 0}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
          {(Object.keys(statusConfig) as WebhookStatus[]).map((status) => {
            const config = statusConfig[status];
            return (
              <Card 
                key={status} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setStatusFilter(status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <config.icon className={`h-5 w-5 ${config.className.split(" ")[1]}`} />
                    <div>
                      <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
                      <div className="text-xs text-muted-foreground">{config.label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event type, external ID, or store..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as WebhookStatus | "all")}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No webhook events found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>External ID</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const config = statusConfig[event.status];
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium font-mono text-sm">
                            {event.event_type}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {event.external_id.slice(0, 20)}...
                          </TableCell>
                          <TableCell>
                            {event.store ? (
                              <Badge variant="outline">{event.store.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.className}>
                              <config.icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(event.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {event.processed_at 
                              ? format(new Date(event.processed_at), "MMM d, HH:mm")
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleViewEvent(event)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {event.status === "failed" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => replayEvent(event.id)}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteEvent(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono">{selectedEvent?.event_type}</span>
              {selectedEvent && (
                <Badge variant="outline" className={statusConfig[selectedEvent.status].className}>
                  {statusConfig[selectedEvent.status].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">External ID:</span>
                  <p className="font-mono text-xs break-all">{selectedEvent.external_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <p>{selectedEvent.store?.name || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Received:</span>
                  <p>{format(new Date(selectedEvent.created_at), "PPpp")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Processed:</span>
                  <p>
                    {selectedEvent.processed_at 
                      ? format(new Date(selectedEvent.processed_at), "PPpp")
                      : "Not processed"
                    }
                  </p>
                </div>
              </div>

              {selectedEvent.error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="text-sm text-destructive/80">{selectedEvent.error}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground text-sm">Payload:</span>
                <ScrollArea className="h-64 mt-2">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2">
                {selectedEvent.status === "failed" && (
                  <Button onClick={() => replayEvent(selectedEvent.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Replay Event
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
