import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Clock, Package, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApprovalCardProps {
  id: string;
  resourceType: string;
  action: string;
  requestedBy: string;
  createdAt: string;
  payload: Record<string, unknown>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const resourceIcons: Record<string, typeof Package> = {
  listing: Rocket,
  product: Package,
};

export function ApprovalCard({
  id,
  resourceType,
  action,
  requestedBy,
  createdAt,
  payload,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const Icon = resourceIcons[resourceType] || Package;

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground capitalize">
                {action} {resourceType}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="pending">Pending</Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
          <pre>{JSON.stringify(payload, null, 2).slice(0, 200)}...</pre>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs bg-secondary">
              {requestedBy.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{requestedBy}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => onApprove(id)}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
