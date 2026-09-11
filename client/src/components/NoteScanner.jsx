import { useState } from "react";
import { Camera, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import api from "../utils/api";
import * as Tesseract from "tesseract.js"; // ✅ Import Tesseract for fallback

export default function NoteScanner({ onScanComplete }) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'warning', 'error'
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setStatus(null);
    setMessage("");
    setProgress(0);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        // 1. Try the backend API first (OCR.space)
        const response = await api.post("/ai/ocr/extract-text", { imageUrl: reader.result });
        
        if (response.data.success && response.data.text && response.data.text.trim() !== "") {
          setStatus("success");
          setMessage("Text extracted successfully via API!");
          onScanComplete(response.data.text);
        } else {
          throw new Error("API returned no text");
        }
      } catch (error) {
        // 2. ✅ FALLBACK: Use local Tesseract engine if API fails (503, network error, etc.)
        console.warn("API OCR failed, falling back to local Tesseract engine:", error);
        setStatus("warning");
        setMessage("API unavailable. Using local engine (this may take a moment)...");
        
        try {
          const result = await Tesseract.recognize(reader.result, "eng", {
            logger: (m) => {
              if (m.status === "recognizing text") {
                setProgress(Math.round(m.progress * 100));
              }
            },
          });
          
          const extractedText = result.data.text.trim();
          if (extractedText) {
            setStatus("success");
            setMessage("Text extracted successfully via local engine!");
            onScanComplete(extractedText);
          } else {
            setStatus("warning");
            setMessage("No text detected. Please try a clearer image.");
          }
        } catch (tesseractError) {
          console.error("Tesseract fallback also failed:", tesseractError);
          setStatus("error");
          setMessage("Failed to extract text. Please try a clearer image or type manually.");
        }
      } finally {
        setIsScanning(false);
        setProgress(0);
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
            <p className="text-sm text-muted-foreground text-center px-4">
              {isScanning ? (progress > 0 ? `Processing locally... ${progress}%` : "Scanning...") : "Click to upload an image of your notes"}
            </p>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isScanning} />
          </div>
        </label>
      </div>

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