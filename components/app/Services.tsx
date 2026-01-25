"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import React, { useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { File, Files, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Script from "next/script";
import { FileData } from "@/lib/interface";
import drive from "@/public/drive.png";

interface UserData {
  email: string;
  id: string;
  authenticated?: boolean;
}

interface ServicesProps {
  user: UserData | null;
}

export function Services({ user }: ServicesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const [extractedData, setExtractedData] = useState<FileData[]>([]);

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ];

  const handleConnect = () => login();
  const handleWatch = () => login();
  const openFolderPicker = () => folderInputRef.current?.click();
  const openFilePicker = () => fileInputRef.current?.click();

  const actions = [
    {
      label: "Google Drive",
      action: "Connect",
      isImage: true,
      handler: handleConnect,
    },
    {
      label: "Google Drive",
      action: "Watch",
      isImage: true,
      handler: handleWatch,
    },
    {
      label: "Upload",
      action: "Folder",
      icon: (
        <Files className="scale-180 m-2 text-slate-500 group-hover:text-emerald-600 transition-colors" />
      ),
      isImage: false,
      handler: openFolderPicker,
    },
    {
      label: "Upload",
      action: "File",
      icon: (
        <File className="scale-180 m-2 text-slate-500 group-hover:text-amber-600 transition-colors" />
      ),
      isImage: false,
      handler: openFilePicker,
    },
  ];

  const handleSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to upload files");
      return;
    }

    const formData = new FormData();
    let validFilesCount = 0;

    if (user?.id && description) {
      formData.append("userId", user.id);
      formData.append("description", description);
    }

    Array.from(files).forEach((file) => {
      const isAllowedType = ALLOWED_MIME_TYPES.includes(file.type);
      const isUnderSizeLimit = file.size <= MAX_FILE_SIZE_BYTES;

      if (!isAllowedType) {
        toast.warning(`${file.name}: Type not allowed`);
        return;
      }
      if (!isUnderSizeLimit) {
        toast.warning(`${file.name} too large`);
        return;
      }

      formData.append("files", file, file.webkitRelativePath || file.name);
      validFilesCount++;
    });

    if (validFilesCount === 0) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        const rawData = await response.json();
        const normalizedData = Array.isArray(rawData) ? rawData : [rawData];

        setExtractedData(normalizedData);
        toast.success("Analysis Complete");
      } else if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error("Upload failed on the server.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.warning("Could not connect to the backend server");
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      openPicker(tokenResponse.access_token);
    },
    scope: "https://www.googleapis.com/auth/drive.readonly",
  });

  const openPicker = (token: string) => {
    if (!isPickerLoaded) return alert("Picker API not loaded yet.");
    const biasbreakerToken = localStorage.getItem("token");
    const google = (window as any).google;

    const handleConnectDrive = async (
      folderId: string,
      userAccessToken: string,
    ) => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/get-folder`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${biasbreakerToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              folderId: folderId,
              description: description,
              userId: user?.id,
              googleToken: userAccessToken,
              email: user?.email,
            }),
          },
        );

        const data = await response.json();

        if (response.ok) {
          const normalizedData = Array.isArray(data) ? data : [data];
          setExtractedData(normalizedData);
          toast.success("Folder processed and analyzed successfully");
        } else {
          console.error("Backend Error:", data.detail || data.error);
          toast.error(data.detail || "Failed to process folder");
        }
      } catch (error) {
        console.error("Network Error:", error);
        toast.error("Could not reach analysis server");
      } finally {
        setIsLoading(false);
      }
    };

    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMode(google.picker.DocsViewMode.LIST);

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_PICKER_KEY)
      .setAppId(process.env.NEXT_PUBLIC_APP_ID)
      .setTitle("Select Biasbreaker Project Folder")
      .setSize(1050, 650)
      .setOrigin(window.location.origin)
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const folderId = data.docs[0].id;
          try {
            await handleConnectDrive(folderId, token);
          } catch (err) {
            console.error("Backend fetch failed:", err);
            setIsLoading(false);
          }
        } else if (data.action === google.picker.Action.CANCEL) {
          setIsLoading(false);
        }
      })
      .build();

    picker.setVisible(true);
    setIsLoading(true);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="flex flex-col items-center justify-start p-4 sm:p-6">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleSelection}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        onChange={handleSelection}
        /* @ts-ignore */
        webkitdirectory=""
        directory=""
      />
      <div className="w-full max-w-4xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-main tracking-tight">
            Services
          </h1>
          <p className="text-slate-500 mb-6">
            Manage your connections and folders
          </p>

          <div className="max-w-md mx-auto mb-8">
            <textarea
              placeholder="Describe your requirements here to match..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-main/2 border-2 border-transparent shadow-inner text-main focus:outline-none focus:border-main/10 placeholder:text-slate-400 transition-colors"
            />
          </div>
        </header>
        <Script
          src="https://apis.google.com/js/api.js"
          onLoad={() => {
            (window as any).gapi.load("picker", () => setIsPickerLoaded(true));
          }}
        />
        <nav className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12 justify-items-center">
          {actions.map((item, idx) => (
            <Button
              key={idx}
              variant="outline"
              onClick={item.handler}
              className="
          group relative flex flex-col items-start justify-between 
          h-35 w-full max-w-45
          p-5 border-0 shadow-md hover:shadow-2xl 
          bg-white hover:bg-main/5 
          transition-all duration-300 rounded-3xl rounded-t-none hover:rounded-t-3xl hover:rounded-b-none overflow-hidden
        "
            >
              <div className="shrink-0">
                {item.isImage ? (
                  <Image
                    src={drive}
                    alt="icon"
                    width={48}
                    height={48}
                    className="grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <div className="text-slate-400 group-hover:text-main transition-colors">
                    {item.icon}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start text-left mt-4">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 group-hover:text-main">
                  {item.label}
                </span>
                <span className="text-xl font-extrabold group-hover:text-main leading-tight">
                  {item.action}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-main scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </Button>
          ))}
        </nav>
        {extractedData.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-b-slate-300 pb-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Processing Results
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExtractedData([])}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Clear
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {extractedData.map((file, fileIdx) => (
                <div
                  key={fileIdx}
                  className="rounded-2xl sm:rounded-4xl px-2 sm:px-4 pb-3 bg-white/5 border border-white/5 sm:border-0"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 py-2">
                    <h3 className="font-semibold text-main flex items-center gap-2 text-sm sm:text-base break-all">
                      <File className="w-4 h-4 shrink-0" /> {file.filename}
                    </h3>

                    {file.ml_analysis && (
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                            file.ml_analysis.status === "High Match"
                              ? "bg-emerald-50 text-emerald-700 border-0"
                              : "bg-amber-50 text-amber-700 border-0"
                          }`}
                        >
                          {file.ml_analysis.status === "High Match" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {Math.round(file.ml_analysis.match_score * 100)}%
                          Match
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}