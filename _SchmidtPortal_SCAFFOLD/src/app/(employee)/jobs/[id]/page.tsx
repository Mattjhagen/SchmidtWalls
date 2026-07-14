"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/shared/Shell";
import Link from "next/link";

interface Photo {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

interface Job {
  id: string;
  name: string;
  status: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  customer: { full_name?: string; company?: string; name?: string } | null;
}

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/jobs", label: "Jobs" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
];

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchJobAndPhotos();
  }, [jobId]);

  async function fetchJobAndPhotos() {
    try {
      // Fetch job details
      const jobRes = await fetch(`/api/jobs?id=${jobId}`);
      if (jobRes.ok) {
        const data = await jobRes.json();
        // The jobs API returns all jobs; find this one
        if (Array.isArray(data)) {
          const found = data.find((j: Job) => j.id === jobId);
          setJob(found || null);
        } else {
          setJob(data);
        }
      }

      // Fetch photos for this job
      const photosRes = await fetch(`/api/jobs/upload-photo?jobId=${jobId}`);
      if (photosRes.ok) {
        // Photos API uses GET handler we'll add or use Supabase directly
      }
    } finally {
      setLoading(false);
    }

    // Fetch photos via separate call using Supabase client
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: photoData } = await supabase
      .from("photos")
      .select("id, url, caption, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    setPhotos(photoData || []);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("jobId", jobId);
      formData.append("caption", caption);

      const res = await fetch("/api/jobs/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newPhoto = await res.json();
        setPhotos((prev) => [newPhoto, ...prev]);
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        // Reset file input
        const input = document.getElementById("photo-input") as HTMLInputElement;
        if (input) input.value = "";
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;

    const res = await fetch(`/api/jobs/upload-photo?id=${photoId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }

  if (loading) {
    return (
      <Shell nav={nav} title="Job Details">
        <div style={{ color: "#64748b" }}>Loading...</div>
      </Shell>
    );
  }

  if (!job) {
    return (
      <Shell nav={nav} title="Job Not Found">
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "#64748b" }}>This job could not be found.</p>
          <Link href="/jobs" className="btn btn-primary" style={{ marginTop: 12 }}>
            ← Back to Jobs
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell nav={nav} title={job.name}>
      {/* Job info */}
      <div style={{ marginBottom: 6 }}>
        <Link href="/jobs" style={{ fontSize: 13, color: "#206BD4", textDecoration: "none" }}>
          ← Back to Jobs Board
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Status</div>
            <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
              {job.status?.replace("_", " ") || "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Customer</div>
            <div style={{ fontWeight: 600 }}>
              {job.customer?.company || job.customer?.full_name || job.customer?.name || "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Address</div>
            <div style={{ fontWeight: 600 }}>{job.address || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Created</div>
            <div style={{ fontWeight: 600 }}>
              {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
        {job.notes && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 14 }}>{job.notes}</div>
          </div>
        )}
      </div>

      {/* Photo Upload Section */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        Job Photos ({photos.length})
      </h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Upload New Photo</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              id="photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileSelect}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: 13,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              className="input"
              type="text"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{ opacity: !selectedFile || uploading ? 0.5 : 1 }}
          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
        </div>

        {previewUrl && (
          <div style={{ marginTop: 12 }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
          </div>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>No photos yet. Upload the first one above.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {photos.map((photo) => (
            <div key={photo.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <img
                src={photo.url}
                alt={photo.caption || "Job photo"}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div style={{ padding: "10px 12px" }}>
                {photo.caption && (
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {photo.caption}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(photo.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
