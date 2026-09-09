import { useState } from "react";
import { Camera, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react"; // ✅ New icons
import api from "../utils/api";

export default function NoteScanner({ onScanComplete }) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'warning', 'error'
  const [message, setMessage] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setStatus(null);
    setMessage("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await api.post("/ai/ocr/extract-text", { imageUrl: reader.result });
        
        if (response.data.success) {
          if (!response.data.text || response.data.text.trim() === "") {
            setStatus("warning");
            setMessage("No text detected in this image. Please try a clearer photo.");
          } else {
            setStatus("success");
            setMessage("Text extracted successfully!");
            onScanComplete(response.data.text);
          }
        } else {
          setStatus("error");
          setMessage(response.data.message || "OCR failed.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Failed to connect to OCR service. Please try again.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-xl cursor-pointer bg-card hover:bg-accent transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isScanning ? (
              <Loader2 className="w-8 h-8 text-brand animate-spin mb-2" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              {isScanning ? "Scanning..." : "Click to upload an image of your notes"}
            </p>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isScanning} />
          </div>
        </label>
      </div>

      {/* ✅ FIX: Distinct icons for each status */}
      {status && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          status === "success" ? "bg-green-500/10 text-green-600 border border-green-500/20" :
          status === "warning" ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
          "bg-red-500/10 text-red-600 border border-red-500/20"
        }`}>
          {status === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
          {status === "warning" && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {status === "error" && <XCircle className="w-4 h-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}