import { NextRequest, NextResponse } from 'next/server';

const OCR_API_URL = 'https://shads229-ocr-minerva.hf.space/extract';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lang = formData.get('lang') as string || 'fr';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50 MB max)
    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 50 MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    console.log('[OCR] Processing file:', file.name, 'Size:', (file.size / 1024).toFixed(1), 'KB');

    // Prepare form data for OCR API
    const ocrFormData = new FormData();
    ocrFormData.append('file', file);
    ocrFormData.append('lang', lang);

    // Call OCR API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    try {
      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: ocrFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OCR] API error:', response.status, errorText);

        if (response.status === 503) {
          return NextResponse.json(
            { error: 'OCR service is starting up. Please try again in 30 seconds.' },
            { status: 503 }
          );
        }

        return NextResponse.json(
          { error: 'OCR extraction failed' },
          { status: 500 }
        );
      }

      const data = await response.json();

      if (!data.text || data.text.trim().length === 0) {
        return NextResponse.json(
          { error: 'No text could be extracted from the file' },
          { status: 400 }
        );
      }

      console.log('[OCR] Success! Extracted', data.text.length, 'characters');

      return NextResponse.json({
        text: data.text,
        length: data.text.length
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[OCR] Timeout after 5 minutes');
        return NextResponse.json(
          { error: 'Request timeout. The file may be too large or complex.' },
          { status: 504 }
        );
      }

      throw fetchError;
    }

  } catch (error: any) {
    console.error('[OCR] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
