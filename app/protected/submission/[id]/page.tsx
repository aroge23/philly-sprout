import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SubmissionsMapLoader } from "@/components/submissions-map-loader";
import type { Submission } from "@/components/submissions-map";
import { PhotoCarousel } from "./photo-carousel";

type TreeCandidate = {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  street_address: string | null;
  overall_suitability: string | null;
  notes: string | null;
  photo_url: string | null;
  pit_size: string | null;
  pit_edge_clearance: string | null;
  no_obstructions: string | null;
  driveway_clearance: string | null;
  corner_clearance: string | null;
  pole_hydrant_clearance: string | null;
  tree_clearance: string | null;
  ai_confidence_notes: string | null;
};

function suitabilityVariant(suitability: string | null) {
  switch (suitability) {
    case "Likely Suitable":
      return "default" as const;
    case "Possibly Suitable":
      return "secondary" as const;
    case "Likely Unsuitable":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function CriterionRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const icon =
    value === "pass" ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : value === "fail" ? (
      <XCircle className="w-4 h-4 text-red-500" />
    ) : (
      <HelpCircle className="w-4 h-4 text-yellow-500" />
    );

  const text =
    value === "pass" ? "Pass" : value === "fail" ? "Fail" : "Unclear";

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {text}
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function SubmissionDetail({ id }: { id: string }) {
  const supabase = await createClient();

  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("tree_candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const row = data as TreeCandidate;

  const criteria = [
    { label: "Pit Size (3' × 3' min)", value: row.pit_size },
    { label: "Pit Edge Clearance (2' from curb)", value: row.pit_edge_clearance },
    { label: "No Obstructions", value: row.no_obstructions },
    { label: "Driveway Clearance (3' min)", value: row.driveway_clearance },
    { label: "Corner Clearance (25' min)", value: row.corner_clearance },
    { label: "Pole/Hydrant Clearance", value: row.pole_hydrant_clearance },
    { label: "Tree Clearance (20' min)", value: row.tree_clearance },
  ];

  const passCount = criteria.filter((c) => c.value === "pass").length;
  const totalCount = criteria.filter((c) => c.value !== null).length;

  const mapSubmission: Submission = {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    street_address: row.street_address,
    overall_suitability: row.overall_suitability,
    created_at: row.created_at,
    notes: row.notes,
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
          <Link href="/protected/map">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">
              {row.street_address || "Unnamed Site"}
            </h1>
            <Badge variant={suitabilityVariant(row.overall_suitability)}>
              {row.overall_suitability ?? "Unrated"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(row.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Photo(s) */}
      {row.photo_url ? (() => {
        let urls: string[];
        try {
          const parsed = JSON.parse(row.photo_url);
          urls = Array.isArray(parsed) ? parsed : [row.photo_url];
        } catch {
          urls = [row.photo_url];
        }
        return <PhotoCarousel urls={urls} alt={row.street_address || "Site"} />;
      })() : (
        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center h-[200px] bg-muted/30 text-muted-foreground">
              <Camera className="w-8 h-8 mb-2" />
              <p className="text-sm">No photo available</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Criteria */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            Site Criteria
            <span className="text-sm font-normal text-muted-foreground">
              {passCount}/{totalCount} pass
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criteria.map((c) => (
            <CriterionRow key={c.label} label={c.label} value={c.value} />
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      {row.notes && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {row.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Notes */}
      {row.ai_confidence_notes && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {row.ai_confidence_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Location map */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SubmissionsMapLoader
            submissions={[mapSubmission]}
            height="250px"
            defaultZoom={17}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-4">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SubmissionDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function SubmissionDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
