import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import { Camera, Upload, Loader2, X, Scan, RefreshCw } from "lucide-react";

export default function NoteScanner({ onScanComplete }) {
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setExtractedText("");
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!image) return;

    setScanning(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(image, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });

      setExtractedText(result.data.text);
      
      // Auto-send to parent component
      if (onScanComplete && result.data.text.trim()) {
        onScanComplete(result.data.text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to scan the image. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setExtractedText("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
          <Scan className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-foreground">Scan Your Notes</h3>
          <p className="text-xs text-muted-foreground">Snap a photo or upload an image</p>
        </div>
      </div>

      {/* Upload Area */}
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
            Supports: JPG, PNG, WEBP
          </p>
          <input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handleImageUpload}
  className="hidden"
/>
        </div>
      )}

      {/* Image Preview */}
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

          {scanning ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning text...
                </span>
                <span className="font-medium text-brand">{progress}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleScan}
              className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all flex items-center justify-center gap-2"
            >
              <Scan className="w-5 h-5" />
              Extract Text
            </button>
          )}
        </div>
      )}

      {/* Extracted Text */}
      {extractedText && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Extracted Text:</h4>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-background text-foreground text-xs font-medium hover:bg-background/80 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Scan New
              </button>
            </div>
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
            ️ You can edit the text before using it
          </p>
        </div>
      )}
    </div>
  );
}