"use client";

import { toPng } from "html-to-image";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  File,
  Files,
  Trash2,
  Download,
  Paperclip,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ServerCogIcon,
  PlugZap,
  Loader,
  RefreshCcw,
  ChevronRight,
  Cog,
  MenuSquare,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Script from "next/script";
import { FileData } from "@/lib/interface";
import drive from "@/public/drive.png";
import { AnalysisChart } from "../ui/radar";

export function Services({ user }: { user: any }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const [extractedData, setExtractedData] = useState<FileData[]>([]);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(
    null,
  );

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const fetchHistory = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const history = await res.json();
        setExtractedData(history);
        const stillWorking = history.some(
          (f: any) => f.status === "pending" || f.status === "processing",
        );
        if (stillWorking) setIsProcessing(true);
        else setIsProcessing(false);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(fetchHistory, 5 * 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing, user]);
  useEffect(() => {
    setIsLoading(true);
    fetchHistory().finally(() => setIsLoading(false));
  }, [user]);

  const handleSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const toastId = toast.loading(`Collecting files...`);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!description) {
      toast.error("Please provide a job description first.");
      return;
    }

    const token = localStorage.getItem("token");
    const validFiles = Array.from(files).filter(
      (f) =>
        ALLOWED_MIME_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE_BYTES,
    );

    if (validFiles.length === 0) {
      toast.error("No valid PDF or Docx files selected.");
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);
    toast.dismiss(toastId);
    toast.success("Collected " + validFiles.length + " Files");

    const formData = new FormData();
    validFiles.forEach((file) => formData.append("files", file));
    formData.append("description", description);

    try {
      const uploadToastId = toast.loading(
        `Uploading ${validFiles.length} files...`,
      );
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (response.ok) {
        const localPlaceholders: FileData[] = validFiles.map((f) => ({
          id: Math.random().toString(),
          filename: f.name,
          status: "processing",
          match_score: null,
          details: null,
          created_at: new Date().toISOString(),
        }));

        setExtractedData((prev) => [...localPlaceholders, ...prev]);
        toast.dismiss(uploadToastId);
        toast.success(`Uploaded ${validFiles.length} files`);

        fetchHistory();
      } else {
        toast.error("Upload failed", { id: uploadToastId });
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error("Network error", { id: toastId });
      setIsProcessing(false);
    } finally {
      setIsLoading(false);
      toast.dismiss(toastId);
    }
  };
  const exportToCSV = () => {
    toast.success("Save CSV?", {
      description: "This will download the Report.csv",
      action: {
        label: "Download",
        onClick: () => {
          if (extractedData.length === 0) return;

          const fileName = `Report.csv`;

          const headers = [
            "ID",
            "Filename",
            "Status",
            "Match Score (%)",
            "Matched Keywords",
            "Missing Keywords",
            "Created At",
          ];

          const rows = extractedData.map((file) => {
            const matched = file.details?.matched_keywords || [];
            const missing = file.details?.missing_keywords || [];

            const displayScore =
              file.match_score !== null
                ? file.match_score <= 1
                  ? file.match_score
                  : file.match_score
                : "N/A";

            return [
              `"${file.id}"`,
              `"${file.filename.split("/")[file.filename.split("/").length - 1]}"`,
              file.status.toUpperCase(),
              displayScore,
              `"${matched.join(", ")}"`,
              `"${missing.join(", ")}"`,
              `"${new Date(file.created_at).toLocaleString()}"`,
            ];
          });

          const csvContent = [headers, ...rows]
            .map((e) => e.join(","))
            .join("\n");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.success("Report Downloaded");
        },
      },
    });
  };
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => openPicker(tokenResponse.access_token),
    scope: "https://www.googleapis.com/auth/drive.readonly",
  });
  const openPicker = (token: string) => {
    if (!isPickerLoaded) return toast.error("Picker API not loaded.");
    const google = (window as any).google;

    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_PICKER_KEY)
      .setAppId(process.env.NEXT_PUBLIC_APP_ID)
      .setTitle("Select Google Drive Folder")
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const folderId = data.docs[0].id;
          setIsProcessing(true);
          const toastId = toast.loading("Processing Drive folder...");

          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/get-folder`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                  folderId: folderId,
                  googleToken: token,
                  description: description || "Resume Analysis",
                }),
              },
            );

            if (response.ok) {
              const responseData = await response.json();

              const placeholders = responseData.files.map((f: any) => ({
                id: f.id,
                filename: f.name,
                status: "processing",
                match_score: null,
                details: null,
                created_at: new Date().toISOString(),
              }));

              setExtractedData((prev) => [...placeholders, ...prev]);
              setIsProcessing(true);
              toast.dismiss(toastId);
              toast.success(responseData.message);
            } else {
              const errData = await response.json();
              toast.dismiss(toastId);
              console.error("422 Details:", errData);
              toast.error("Processing failed (422). Check console.", {
                id: toastId,
              });
            }
          } catch (err) {
            toast.error("Network error.", { id: toastId });
          } finally {
            setIsProcessing(false);
          }
        }
      })
      .build();

    picker.setVisible(true);
  };
  const resetHistory = async () => {
    const token = localStorage.getItem("token");
    if (extractedData.length < 1) {
      toast.error("Nothing to Erase...");
      return;
    }
    toast.info("Erase History?", {
      description: "This action cannot be undone",
      action: {
        label: "Clear All",
        onClick: async () => {
          try {
            const toastId = toast.loading("Erasing history...");
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/reset-history`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (res.ok) {
              setExtractedData([]);
              toast.dismiss(toastId);
              toast.success("History cleared successfully");
            } else {
              toast.dismiss(toastId);
              toast.error("Failed to clear history");
            }
          } catch (error) {
            toast.error("Network error. Please try again.");
          }
        },
      },
    });
  };
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          bg: "bg-emerald-500/10 text-emerald-600",
        };
      case "processing":
        return {
          icon: <Loader className="w-4 h-4 animate-spin" />,
          bg: "bg-main/10 text-main animate-pulse",
        };
      case "failed":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          bg: "bg-rose-500/10 text-rose-600",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          bg: "bg-slate-100 text-slate-500",
        };
    }
  };

  return (
    <div className="py-20">
      <Script
        src="https://apis.google.com/js/api.js"
        onLoad={() =>
          (window as any).gapi.load("picker", () => setIsPickerLoaded(true))
        }
      />

<div className="sticky top-3 sm:top-4 bg-white/80 backdrop-blur-xl shadow-lg sm:rounded-full rounded-2xl mx-2 sm:mx-3 md:mx-4 z-50 border border-white/20">
  <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 group transition-all duration-500 group-focus-within:flex-row group-focus-within:items-center">
    
    <div className="flex items-center shrink-0 transition-all duration-500 ease-in-out">
      <div className="p-2 sm:p-2.5 bg-main/10 rounded-xl sm:rounded-4xl shadow-inner border border-main/10 shrink-0 transition-all duration-500 group-focus-within:scale-110 group-focus-within:bg-main/20 group-focus-within:shadow-main/20">
        <MenuSquare className="w-5 h-5 sm:w-6 sm:h-6 text-main group-focus-within:animate-pulse" />
      </div>
      
      <div className="flex flex-col items-center ml-3 group-focus-within:ml-3 transition-all duration-500 ease-in-out max-w-50 opacity-100 sm:group-focus-within:max-w-0 group-focus-within:opacity-100 sm:group-focus-within:ml-0 overflow-hidden">
        <h1 className="text-sm sm:text-lg md:text-xl font-bold text-dark tracking-tight leading-tight whitespace-nowrap">
          Services
        </h1>
        <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">
          Workspace
        </p>
      </div>
    </div>

    <div className="flex-1 w-full items-center relative transition-all duration-500 ease-in-out">
      <textarea
        placeholder="Provide description..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full pl-3 sm:pl-4 pr-11 sm:pr-12 py-2.5 sm:py-3 rounded-3xl bg-gray-100/50 focus:bg-white text-xs sm:text-sm text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-main/20 transition-all resize-none h-10 sm:h-13 shadow-sm"
      />
      
      <label className="absolute right-2 sm:right-2 top-1.5 sm:top-2.5 cursor-pointer p-1.5 sm:p-2 bg-white/80 hover:bg-white shadow-sm rounded-full hover:text-main transition-all shrink-0">
        <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <input type="file" className="hidden" accept=".pdf,.docx,.txt" />
      </label>
    </div>
  </div>
</div>
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-6 mt-6 sm:mt-8 md:mt-12">
        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 md:mb-16">
          {[
            {
              label: "Cloud Source",
              title: "Google Drive",
              icon: <Image src={drive} alt="drive" width={42} height={42} />,
              handler: () => {
                if (!description.trim()) {
                  return toast.error("Description Required", {
                    description: "Please provide description to connect Drive",
                  });
                }
                login();
              },
              orbClass:
                "bg-gradient-to-br from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] opacity-[0.08]",
            },
            {
              label: "Local Source",
              title: "Upload Folder",
              icon: (
                <Files className="w-7 h-7 sm:w-8 sm:h-8 text-fuchsia-500/30" />
              ),
              handler: () => {
                if (!description.trim()) {
                  return toast.error("Description Required", {
                    description: "Please provide description to upload Folder",
                  });
                }
                folderInputRef.current?.click();
              },
              orbClass:
                "bg-gradient-to-br from-fuchsia-500 to-fuchsia-500 opacity-[0.08]",
            },
            {
              label: "Local Source",
              title: "Quick File",
              icon: (
                <File className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500/30" />
              ),
              handler: () => {
                if (!description.trim()) {
                  return toast.error("Description Required", {
                    description: "Please provide description to upload File",
                  });
                }
                fileInputRef.current?.click();
              },
              orbClass:
                "bg-gradient-to-br from-indigo-500 to-indigo-500 opacity-[0.08]",
            },
            {
              label: "Automation",
              title: "Watch Folder",
              icon: (
                <PlugZap className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300" />
              ),
              handler: () => toast.info("feature in development..."),
              disabled: true,
              orbClass: "bg-slate-200 opacity-20",
            },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={action.handler}
              className={`group flex flex-col items-start p-4 sm:p-6 md:p-8 bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-shadow transition-all duration-500 text-left relative overflow-hidden active:scale-95 disabled:opacity-50 ${action.disabled ? "cursor-not-allowed grayscale" : "cursor-pointer hover:shadow-2xl hover:-translate-y-1"}`}
            >
              <div
                className={`mb-3 sm:mb-4 md:mb-5 bg-transparent ${action.label === "Cloud Source" ? "scale-100 sm:scale-125 md:scale-150 group-hover:scale-125 sm:group-hover:scale-150 md:group-hover:scale-[1.75]" : "scale-75 sm:scale-90 group-hover:scale-100 sm:group-hover:scale-125"} transition-all duration-500 group-hover:rotate-3`}
              >
                {action.icon}
              </div>
              <div>
                <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] md:tracking-[0.15em] block mb-0.5 sm:mb-1">
                  {action.label}
                </span>
                <span className="text-base sm:text-lg md:text-xl font-bold text-dark">
                  {action.title}
                </span>
              </div>
              <div
                className={`absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full -mr-10 sm:-mr-12 -mt-10 sm:-mt-12 transition-all duration-700 blur-2xl group-hover:blur-xl group-hover:scale-150 group-hover:opacity-20 ${action.orbClass}`}
              />
            </button>
          ))}
        </div>

        {extractedData.length !== 0 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-dark">
                Files{" "}
                <span className="text-slate-400 ml-1">
                  ({extractedData.length})
                </span>
              </h2>
              <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={fetchHistory}
                  className="text-[11px] sm:text-xs md:text-sm text-slate-500 hover:text-indigo-500 rounded-lg sm:rounded-xl h-8 sm:h-9 px-2.5 sm:px-3"
                >
                  <RefreshCcw
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 ${isProcessing ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  onClick={exportToCSV}
                  className="text-[11px] sm:text-xs md:text-sm text-slate-500 hover:text-emerald-500 rounded-lg sm:rounded-xl h-8 sm:h-9 px-2.5 sm:px-3"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />{" "}
                  Export
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetHistory}
                  className="text-[11px] sm:text-xs md:text-sm text-slate-500 hover:text-rose-500 rounded-lg sm:rounded-xl h-8 sm:h-9 px-2.5 sm:px-3"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> Erase
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
              {extractedData.map((file, idx) => {
                const displayFilename =
                  file.filename.split("/").pop() || file.filename;
                const config = getStatusConfig(file.status);
                const isInteractive =
                  file.details &&
                  !["processing", "failed", "pending"].includes(file.status);

                return (
                  <div
                    key={idx}
                    onClick={() => isInteractive && setSelectedFileData(file)}
                    className={`group bg-white p-3 sm:p-4 md:px-8 md:py-6 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] shadow-shadow transition-all duration-500 relative overflow-hidden min-h-fit ${
                      isInteractive
                        ? "hover:shadow-xl cursor-pointer active:scale-[0.98]"
                        : "cursor-default"
                    }`}
                  >
                    <div
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 ${
                        isInteractive ? "mb-3 sm:mb-4 md:mb-6" : ""
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 w-full">
                        {/* Icon Container */}
                        <div
                          className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-14 md:h-14 text-gray-400 bg-gray-50 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isInteractive &&
                            "group-hover:text-main group-hover:bg-main/10 group-hover:rotate-3"
                          }`}
                        >
                          <File className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-7 md:h-7" />
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-bold text-sm sm:text-base md:text-lg truncate leading-tight transition-colors break-words ${
                              isInteractive
                                ? "group-hover:text-main text-dark"
                                : "text-slate-400"
                            }`}
                          >
                            {displayFilename}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider ${config.bg}`}
                            >
                              {config.icon} {file.status.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Match Score */}
                      {file.match_score !== null &&
                        file.status !== "processing" && (
                          <div className="text-right shrink-0 ml-auto sm:ml-0">
                            <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-300 group-hover:text-main transition-colors tracking-tighter tabular-nums">
                              {file.match_score}%
                            </div>
                            <div className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Match
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Footer Action - only visible if interactive */}
                    {isInteractive && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                        <span className="text-[8px] sm:text-[9px] md:text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                          {file.details?.total_matches} Skills Identified
                        </span>
                        <button className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 md:py-2 text-[9px] sm:text-[10px] md:text-xs bg-slate-50 hover:bg-main hover:text-white transition-all duration-300 font-bold text-slate-500 rounded-lg sm:rounded-xl flex items-center justify-center sm:justify-start gap-2 flex-shrink-0">
                          View Report
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Subtle Decorative Orb */}
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-main/5 rounded-full blur-2xl group-hover:bg-main/10 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedFileData && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4 lg:p-6 bg-dark/40 backdrop-blur-md"
          onClick={() => setSelectedFileData(null)}
        >
          <div
            className="bg-white w-full sm:max-w-3xl lg:max-w-4xl rounded-t-3xl sm:rounded-3xl md:rounded-[2.5rem] shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:mb-6 sm:hidden" />

            <button
              onClick={() => setSelectedFileData(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 p-1.5 sm:p-2 bg-slate-50 sm:bg-transparent hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors rounded-lg sm:rounded-xl z-10"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 mt-6 sm:mt-0">
              <div className="order-2 lg:order-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-bold text-dark mb-2 sm:mb-3 pr-8 sm:pr-0 line-clamp-2 sm:line-clamp-none">
                  {selectedFileData.filename}
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm md:text-base leading-relaxed mb-6 sm:mb-8">
                  {selectedFileData.details?.summary}
                </p>

                <div className="space-y-6 sm:space-y-8">
                  <section>
                    <h4 className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-3 sm:mb-4 tracking-widest flex items-center gap-2">
                      <span className="w-6 sm:w-8 h-px bg-slate-200" /> Matched
                      Keywords
                    </h4>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedFileData.details?.matched_keywords.map(
                        (kw, i) => (
                          <span
                            key={i}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 text-[9px] sm:text-[10px] md:text-[11px] font-bold rounded-md sm:rounded-lg border border-emerald-100/50"
                          >
                            {kw}
                          </span>
                        ),
                      )}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-3 sm:mb-4 tracking-widest flex items-center gap-2">
                      <span className="w-6 sm:w-8 h-px bg-slate-200" /> Missing
                      Keywords
                    </h4>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedFileData.details?.missing_keywords.map(
                        (kw, i) => (
                          <span
                            key={i}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-rose-50 text-rose-600 text-[9px] sm:text-[10px] md:text-[11px] font-bold rounded-md sm:rounded-lg border border-rose-100/50"
                          >
                            {kw}
                          </span>
                        ),
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Chart Section - Appears first on mobile for immediate visual impact */}
              <div className="order-1 lg:order-2 flex flex-col items-center justify-center bg-slate-50 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] p-3 sm:p-4 md:p-6 lg:p-8 border border-slate-100">
                <div
                  ref={chartRef}
                  className="w-full max-w-64 sm:max-w-72 md:max-w-full aspect-square"
                >
                  <AnalysisChart
                    data={selectedFileData.details?.radar_data || []}
                    color="#0F172A"
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (chartRef.current) {
                      const dataUrl = await toPng(chartRef.current);
                      const link = document.createElement("a");
                      link.download = "analysis.png";
                      link.href = dataUrl;
                      link.click();
                    }
                  }}
                  className="mt-4 sm:mt-6 w-full sm:w-auto bg-dark hover:bg-emerald-600 text-white rounded-lg sm:rounded-2xl px-4 sm:px-8 md:px-10 h-9 sm:h-10 md:h-12 text-xs sm:text-sm shadow-lg transition-all active:scale-95"
                >
                  Download Analysis
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Inputs Linked to Logic */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleSelection}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        /* @ts-ignore */
        webkitdirectory=""
        directory=""
        onChange={handleSelection}
      />
    </div>
  );
}
