const fetchWithTimeout = async (url, options, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const extractImageText = async (imageData) => {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    const error = new Error('OCR is not configured.');
    error.status = 503;
    throw error;
  }

  const formData = new URLSearchParams();
  formData.append('apikey', apiKey);
  formData.append('base64Image', imageData);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const response = await fetchWithTimeout('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Noted-App/1.0' },
    body: formData.toString(),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error('OCR service failed.');
    error.status = 503;
    throw error;
  }
  if (data.IsErroredOnProcessing) {
    const error = new Error(data.ErrorMessage?.[0] || 'OCR could not process this image.');
    error.status = 422;
    throw error;
  }
  return (data.ParsedResults?.[0]?.ParsedText || '').trim();
};
