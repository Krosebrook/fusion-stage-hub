import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, RefreshCw, Play, Pause, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type JobStatus = "pending" | "claimed" | "running" | "completed" | "failed" | "cancelled";

interface Job {
  id: string;
  type: string;
  store: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt: Date;
}

const mockJobs: Job[] = [
  { id: "job-001", type: "sync_inventory", store: "Shopify Main", status: "completed", attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 30), scheduledAt: new Date(Date.now() - 1000 * 60 * 35) },
  { id: "job-002", type: "publish_listing", store: "Etsy Vintage", status: "running", attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 5), scheduledAt: new Date(Date.now() - 1000 * 60 * 5) },
  { id: "job-003", type: "import_orders", store: "Amazon SC", status: "pending", attempts: 0, maxAttempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 2), scheduledAt: new Date(Date.now() + 1000 * 60 * 5) },
  { id: "job-004", type: "update_prices", store: "Printify", status: "failed", attempts: 3, maxAttempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 60), scheduledAt: new Date(Date.now() - 1000 * 60 * 60) },
  { id: "job-005", type: "reconcile_stock", store: "Amazon KDP", status: "pending", attempts: 0, maxAttempts: 5, createdAt: new Date(Date.now() - 1000 * 60 * 1), scheduledAt: new Date(Date.now() + 1000 * 60 * 10) },
  { id: "job-006", type: "webhook_process", store: "Gumroad", status: "completed", attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 1000 * 60 * 45), scheduledAt: new Date(Date.now() - 1000 * 60 * 45) },
];

export default function Jobs() {
  const [jobs] = useState<Job[]>(mockJobs);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter = filter === "all" || job.status === filter;
    const matchesSearch = job.type.toLowerCase().includes(search.toLowerCase()) ||
      job.store.toLowerCase().includes(search.toLowerCase()) ||
      job.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Job Queue</h2>
            <p className="text-muted-foreground">
              Monitor and manage background jobs across all connected stores.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-1" />
              Pause All
            </Button>
            <Button variant="default" size="sm">
              <Play className="w-4 h-4 mr-1" />
              Resume All
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Job ID</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Store</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Attempts</TableHead>
                    <TableHead className="font-semibold">Scheduled</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs">{job.id}</TableCell>
                      <TableCell className="capitalize">{job.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{job.store}</TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {job.attempts}/{job.maxAttempts}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(job.scheduledAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {job.status === "failed" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
