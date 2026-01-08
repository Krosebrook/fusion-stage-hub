import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Search, RefreshCw, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type JobStatus = Database["public"]["Enums"]["job_status"];
type Job = Database["public"]["Tables"]["jobs"]["Row"];

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [retryingJob, setRetryingJob] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching jobs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setJobs((prev) => [payload.new as Job, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setJobs((prev) =>
              prev.map((job) =>
                job.id === (payload.new as Job).id ? (payload.new as Job) : job
              )
            );
          } else if (payload.eventType === "DELETE") {
            setJobs((prev) =>
              prev.filter((job) => job.id !== (payload.old as Job).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Retry a failed job
  const handleRetry = async (job: Job) => {
    setRetryingJob(job.id);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "pending" as JobStatus,
          attempts: 0,
          last_error: null,
          scheduled_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job requeued",
        description: `Job ${job.id.slice(0, 8)} has been requeued for processing.`,
      });
    } catch (error: any) {
      toast({
        title: "Error retrying job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRetryingJob(null);
    }
  };

  // Cancel a job
  const handleCancel = async (job: Job) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "cancelled" as JobStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job cancelled",
        description: `Job ${job.id.slice(0, 8)} has been cancelled.`,
      });
    } catch (error: any) {
      toast({
        title: "Error cancelling job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter = filter === "all" || job.status === filter;
    const matchesSearch =
      job.job_type.toLowerCase().includes(search.toLowerCase()) ||
      job.id.toLowerCase().includes(search.toLowerCase()) ||
      (job.store_id && job.store_id.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {(["pending", "claimed", "running", "completed", "failed", "cancelled"] as JobStatus[]).map(
            (status) => (
              <Card
                key={status}
                className={`cursor-pointer transition-colors ${
                  filter === status ? "border-primary" : ""
                }`}
                onClick={() => setFilter(filter === status ? "all" : status)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <JobStatusBadge status={status} />
                    <span className="text-lg font-semibold">
                      {statusCounts[status] || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          )}
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
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchJobs} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No jobs found</p>
                <p className="text-sm mt-1">Jobs will appear here when created</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Job ID</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Attempts</TableHead>
                      <TableHead className="font-semibold">Priority</TableHead>
                      <TableHead className="font-semibold">Scheduled</TableHead>
                      <TableHead className="font-semibold">Error</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs">
                          {job.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="capitalize">
                          {job.job_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <JobStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {job.attempts}/{job.max_attempts}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{job.priority}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(job.scheduled_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                          {job.last_error || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(job.status === "failed" || job.status === "cancelled") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRetry(job)}
                                disabled={retryingJob === job.id}
                              >
                                {retryingJob === job.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {(job.status === "pending" || job.status === "claimed") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleCancel(job)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
