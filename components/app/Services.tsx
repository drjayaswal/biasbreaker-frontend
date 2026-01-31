"use client";

import { toPng } from "html-to-image";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  File,
  Trash2,
  Download,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader,
  RefreshCcw,
  Delete,
  MoveRight,
  Folder,
} from "lucide-react";
import Script from "next/script";
import { FileData } from "@/lib/interface";
import { AnalysisChart } from "../ui/radar";
import { cn, getBaseUrl } from "@/lib/utils";
import Image from "next/image";
import Loading from "../ui/loading";

export function Services({ user }: { user: any }) {
  const id = user;
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
      const res = await fetch(`${getBaseUrl()}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const history = await res.json();
        console.log(history);

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

    const formData = new FormData();
    validFiles.forEach((file) => formData.append("files", file));
    formData.append("description", description);

    try {
      const uploadToastId = toast.loading(
        `Uploading ${validFiles.length} files...`,
      );
      const response = await fetch(`${getBaseUrl()}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

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
      toast.error("Network error");
      setIsProcessing(false);
    } finally {
      setIsLoading(false);
    }
  };
  const exportToCSV = () => {
    const completedFiles = extractedData.filter(
      (file) => file.status === "completed",
    );

    if (completedFiles.length === 0) {
      toast.error("No completed files to export");
      return;
    }

    toast.success("Save CSV?", {
      description: `Download report for ${completedFiles.length} completed files`,
      action: {
        label: "Download",
        onClick: () => {
          const fileName = `Report.csv`;

          const headers = [
            "ID",
            "Filename",
            "Status",
            "Match Score (%)",
            "Emails",
            "Phones",
            "Links",
            "Created At",
          ];

          const rows = completedFiles.map((file) => {
            const emails = file.candidate_info?.contact?.emails || [];
            const phones = file.candidate_info?.contact?.phones || [];
            const links = file.candidate_info?.contact?.links || [];

            const displayScore =
              file.match_score !== null ? file.match_score : "N/A";

            return [
              `"${file.id}"`,
              `"${file.filename.split("/").pop()}"`,
              file.status.toUpperCase(),
              displayScore,
              `"${emails.join(", ")}"`,
              `"${phones.join(", ")}"`,
              `"${links.join(", ")}"`,
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
            const response = await fetch(`${getBaseUrl()}/get-folder`, {
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
            });

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
            const res = await fetch(`${getBaseUrl()}/reset-history`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });

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
  const getDescription = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const toastId = toast.loading("Extracting description from file...");

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Invalid file type for Job Description");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsProcessing(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/get-description`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );
      toast.dismiss(toastId);
      if (response.ok) {
        const data = await response.json();
        if (data.description) {
          setDescription(data.description);
          toast.success("Description updated from file");
        }
      } else {
        toast.error("Failed to extract description from file");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Error connecting to server");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };
  if (isLoading) return <Loading />;

  return (
    <div className="bg-transparent text-white font-mono pt-15.5">
      <Script
        src="https://apis.google.com/js/api.js"
        onLoad={() =>
          (window as any).gapi.load("picker", () => setIsPickerLoaded(true))
        }
      />

      <div className="max-w-full grid grid-cols-1 lg:grid-cols-10 gap-0 h-full lg:h-[calc(100vh-80px)]">
        <div className="lg:col-span-6 p-6 lg:p-12 flex flex-col space-y-10 border-r border-white/5">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                Description
              </h3>
              {description && (
                <span className="text-[10px] text-indigo-400">
                  Ready for Analysis
                </span>
              )}
            </div>

            <div className="relative group">
              <textarea
                placeholder="Paste the requirements here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-64 p-6 bg-black border-dashed border focus:border-white/40 border-white/30 text-sm leading-relaxed text-white placeholder:text-white/40 outline-none transition-all resize-none"
              />
              <div className="absolute top-1 right-1 flex flex-col">
                {description && (
                  <button
                    onClick={() => setDescription("")}
                    className="p-2 bg-black cursor-pointer text-white hover:bg-red-500 transition-all"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                )}
                <label className="p-2 bg-black cursor-pointer text-white hover:bg-indigo-500 transition-all">
                  <Paperclip className="w-5 h-5" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={getDescription}
                    accept=".pdf,.docx,.txt"
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">
              Source Selection
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 bg-black border border-white/20">
              {[
                {
                  title: "Google Drive",
                  icon: (
                    <Image
                      src="/drive.png"
                      alt="D"
                      width={20}
                      height={20}
                      className="invert opacity-60 group-hover:opacity-100"
                    />
                  ),
                  handler: () =>
                    description.trim()
                      ? login()
                      : toast.error("Description Required"),
                  color: "hover:bg-indigo-700",
                },
                {
                  title: "Upload Folder",
                  icon: (
                    <Folder className="w-5 h-5 text-white/60 group-hover:text-white" />
                  ),
                  handler: () =>
                    description.trim()
                      ? folderInputRef.current?.click()
                      : toast.error("Description Required"),
                  color: "hover:bg-lime-700",
                },
                {
                  title: "Quick File",
                  icon: (
                    <File className="w-5 h-5 text-white/60 group-hover:text-white" />
                  ),
                  handler: () =>
                    description.trim()
                      ? fileInputRef.current?.click()
                      : toast.error("Description Required"),
                  color: "hover:bg-fuchsia-700",
                },
                {
                  title: "Watch Folder",
                  icon: (
                    <span className="text-[9px] border border-white/20 px-1 opacity-40">
                      LOCK
                    </span>
                  ),
                  handler: () => toast.info("Coming soon..."),
                  disabled: true,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.handler}
                  disabled={btn.disabled}
                  className={cn(
                    "group/btn relative flex items-center justify-between overflow-hidden px-8 py-4 font-bold text-white transition-all duration-500",
                    btn.disabled
                      ? "opacity-30 cursor-not-allowed"
                      : cn("cursor-pointer hover:bg-indigo-600", btn.color),
                  )}
                >
                  <span className="relative z-10 transition-all duration-500 group-hover/btn:tracking-widest mr-4">
                    {btn.title}
                  </span>
                  <div className="relative flex items-center justify-center h-6 w-6 overflow-hidden">
                    <div className="absolute transform transition-all duration-500 -translate-x-full opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100 flex items-center justify-center">
                      {btn.icon}
                    </div>
                    <div className="transition-all duration-500 opacity-100 group-hover/btn:translate-x-full group-hover/btn:opacity-0 flex items-center justify-center">
                      {btn.icon}
                    </div>
                  </div>
                  {!btn.disabled && (
                    <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover/btn:translate-x-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 flex flex-col border-2 bg-black border-white/10">
          <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-md z-20">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-white/90">
                Analysis
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono text-white/30">
                  {extractedData.length.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="flex items-center bg-white/5 border border-white/10 p-0.5">
              <button
                onClick={fetchHistory}
                title="Sync History"
                className="group cursor-pointer flex items-center justify-center h-8 w-9 transition-all hover:bg-indigo-500"
              >
                <RefreshCcw
                  className={cn(
                    "w-3.5 h-3.5 text-white transition-all",
                    isProcessing && "animate-spin",
                  )}
                />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={exportToCSV}
                title="Export CSV"
                className="group cursor-pointer flex items-center justify-center h-8 w-9 transition-all hover:bg-emerald-600"
              >
                <Download className="w-3.5 h-3.5 text-white transition-all" />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={resetHistory}
                title="Clear All"
                className="group cursor-pointer flex items-center justify-center h-8 w-9 transition-all hover:bg-red-500"
              >
                <Trash2 className="w-3.5 h-3.5 text-white transition-all" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 border-t-2 border-white/10">
            {extractedData.length === 0 ? (
              <div className="h-full flex border-x-2 border-dashed border-white/30 flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <File className="w-6 h-6" />
                </div>
                <p className="text-xs uppercase tracking-widest">
                  Awaiting Uploads
                </p>
              </div>
            ) : (
              <div>
                {extractedData.map((file, idx) => {
                  const config = getStatusConfig(file.status);
                  const isInteractive =
                    file.details &&
                    !["processing", "failed", "pending"].includes(file.status);

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={file.id || idx}
                      onClick={() => isInteractive && setSelectedFileData(file)}
                      className={cn(
                        "p-4 border border-white/5  group transition-all",
                        isInteractive
                          ? "cursor-pointer hover:border-white/20 hover:bg-black"
                          : "cursor-default",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <File className="w-8 h-8 text-white/50 group-hover:text-white transition-colors" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold truncate pr-4">
                              {file.filename.split("/").pop()}
                            </h4>
                            <div
                              className={cn(
                                "text-[9px] font-black uppercase inline-flex items-center gap-1 mt-1 px-1.5 py-0.5",
                                config.bg,
                              )}
                            >
                              {config.icon} {file.status}
                            </div>
                          </div>
                        </div>
                        {file.match_score !== null && (
                          <div className="text-right shrink-0">
                            <div
                              className={cn(
                                "text-xl font-black transition-colors duration-500",
                                getScoreColor(file.match_score),
                              )}
                            >
                              {file.match_score}%
                            </div>
                            <div className="text-[8px] text-white/30 uppercase tracking-tighter font-bold">
                              Match Rate
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFileData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFileData(null)}
              transition={{ duration: 0.1, ease: "easeInOut" }}
              className="fixed inset-0 backdrop-blur-md h-full w-full z-30"
            />
            <div
              className="fixed inset-0 grid place-items-center z-500"
              onClick={() => setSelectedFileData(null)}
            >
              <motion.div
                layoutId={`card-${selectedFileData.id}-${id}`}
                ref={ref}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-fit max-h-[90vh] flex flex-col bg-black overflow-hidden shadow-2xl"
              >
                <div className="py-8 px-10 overflow-y-auto no-scrollbar">
                  <div className="flex justify-between items-start mb-6">
                    <motion.h2
                      layoutId={`title-${selectedFileData.id}-${id}`}
                      className="text-2xl md:text-3xl font-bold text-indigo-500"
                    >
                      {selectedFileData.filename.split("/").pop()}
                    </motion.h2>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.1 }}
                      onClick={() => setSelectedFileData(null)}
                      className="p-2 bg-rose-500/50 text-white cursor-pointer rounded-none hover:bg-rose-500 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.1 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.1 }}
                      className="space-y-6"
                    >
                      {selectedFileData.details?.matched_keywords.length &&
                        selectedFileData.details?.matched_keywords.length >
                          0 && (
                          <section>
                            <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">
                              Matched Keywords
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedFileData.details?.matched_keywords.map(
                                (kw, i) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1.5 bg-emerald-500/30 text-white text-xs font-bold rounded-lg"
                                  >
                                    {kw}
                                  </span>
                                ),
                              )}
                            </div>
                          </section>
                        )}
                      {selectedFileData.details?.missing_keywords.length &&
                        selectedFileData.details?.missing_keywords.length >
                          0 && (
                          <section>
                            <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">
                              Missing Keywords
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedFileData.details?.missing_keywords.map(
                                (kw, i) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1.5 bg-rose-500/30 text-white text-xs font-bold rounded-lg"
                                  >
                                    {kw}
                                  </span>
                                ),
                              )}
                            </div>
                          </section>
                        )}
                    </motion.div>

                    <div className="flex flex-col items-center">
                      <motion.div
                        ref={chartRef}
                        className="w-full"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.1 }}
                      >
                        <AnalysisChart
                          data={
                            selectedFileData.details?.radar_data || [1, 2, 3]
                          }
                          color="white"
                        />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.1 }}
                        className="w-full"
                      >
                        <button className="mt-1 w-full bg-black hover:bg-indigo-700 text-white rounded-none h-12 transition-colors">
                          Download Analysis
                        </button>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
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
