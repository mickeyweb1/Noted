import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import { Camera, Upload, Loader2, X, Scan, RefreshCw, AlertCircle } from "lucide-react";
import api from "../utils/api";

export default function NoteScanner({ onScanComplete }) {
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [scanMethod, setScanMethod] = useState("auto"); 
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef(null);

  // ✅ NEW: Compress image in the browser before sending to API
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; // Resize to max 1024px width (perfect for text)
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Compress to JPEG with 70% quality (usually brings 5MB down to ~300KB)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setScanStatus("🔄 Optimizing image for best results...");
      // ✅ Compress the image automatically
      const compressedImage = await compressImage(file);
      setImage(compressedImage);
      setExtractedText("");
      setProgress(0);
      setScanStatus("");
    }
  };

  const handleScan = async () => {
    if (!image) return;

    setScanning(true);
    setProgress(0);
    setScanStatus("🔄 Sending to OCR.Space (Handwriting optimized)...");

    try {
      let finalText = "";

      if (scanMethod === "auto" || scanMethod === "google") {
        try {
          const response = await api.post('/ai/ocr/extract-text', {
            imageUrl: image
          });
          
          if (response.data.success && response.data.text) {
            finalText = response.data.text;
            setScanStatus("✅ OCR.Space successful!");
          } else {
            throw new Error("No text found");
          }
        } catch (apiError) {
          console.warn("OCR.Space failed, falling back to Tesseract:", apiError);
          setScanStatus("⚠️ API failed. Using local fallback (Tesseract)...");
          
          const result = await Tesseract.recognize(image, "eng", {
            logger: (message) => {
              if (message.status === "recognizing text") {
                setProgress(Math.round(message.progress * 100));
              }
            },
          });
          finalText = result.data.text;
          setScanStatus("✅ Tesseract fallback complete!");
        }
      } else {
        setScanStatus("🔍 Using Tesseract OCR...");
        const result = await Tesseract.recognize(image, "eng", {
          logger: (message) => {
            if (message.status === "recognizing text") {
              setProgress(Math.round(message.progress * 100));
            }
          },
        });
        finalText = result.data.text;
        setScanStatus("✅ Tesseract scan complete!");
      }

      setExtractedText(finalText);
      if (onScanComplete && finalText.trim()) {
        onScanComplete(finalText);
      }

    } catch (error) {
      console.error("Final OCR Error:", error);
      setScanStatus("❌ Scan failed. Please try a clearer image.");
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setExtractedText("");
    setProgress(0);
    setScanStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Scan Your Notes</h3>
            <p className="text-xs text-muted-foreground">Snap a photo or upload an image</p>
          </div>
        </div>
        
        <select
          value={scanMethod}
          onChange={(e) => setScanMethod(e.target.value)}
          className="text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="auto">Auto (Best Accuracy + Fallback)</option>
          <option value="tesseract">Tesseract Only (100% Free)</option>
        </select>
      </div>

      {scanStatus && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          scanStatus.includes("✅") ? "bg-green-500/10 text-green-700 border border-green-500/20" :
          scanStatus.includes("⚠️") ? "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20" :
          scanStatus.includes("❌") ? "bg-red-500/10 text-red-700 border border-red-500/20" :
          "bg-blue-500/10 text-blue-700 border border-blue-500/20"
        }`}>
          {scanStatus.includes("✅") ? <AlertCircle className="w-4 h-4" /> :
           scanStatus.includes("⚠️") ? <AlertCircle className="w-4 h-4" /> :
           scanStatus.includes("❌") ? <AlertCircle className="w-4 h-4" /> :
           <Loader2 className="w-4 h-4 animate-spin" />}
          {scanStatus}
        </div>
      )}

      {!image && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-brand/50 transition-all bg-background/50"
        >
          <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground mb-1">
            Click to upload or take a photo
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, WEBP (Auto-compressed)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}

      {image && !extractedText && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img src={image} alt="Uploaded note" className="w-full h-auto max-h-64 object-contain" />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!scanning && (
            <button
              onClick={handleScan}
              className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all flex items-center justify-center gap-2"
            >
              <Scan className="w-5 h-5" />
              Extract Text
            </button>
          )}

          {scanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </span>
                {scanMethod === "tesseract" && (
                  <span className="font-medium text-brand">{progress}%</span>
                )}
              </div>
              {scanMethod === "tesseract" && (
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {extractedText && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Extracted Text:</h4>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-background text-foreground text-xs font-medium hover:bg-background/80 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Scan New
            </button>
          </div>
          <textarea
            value={extractedText}
            onChange={(e) => {
              setExtractedText(e.target.value);
              if (onScanComplete) onScanComplete(e.target.value);
            }}
            className="w-full h-40 rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <p className="text-xs text-muted-foreground">
            ✅ You can edit the text before using it
          </p>
        </div>
      )}
    </div>
  );
}