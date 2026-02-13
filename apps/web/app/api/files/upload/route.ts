import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/src/config';

// Build URL properly using URL constructor
function buildUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If baseUrl is just '/', return the path
  if (baseUrl === '/') return normalizedPath;
  return new URL(normalizedPath, baseUrl).toString();
}

export async function POST(request: NextRequest) {
  try {
    // Check for file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Vui lòng chọn file ảnh' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Chỉ chấp nhận file ảnh: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File quá lớn (tối đa 5MB)' },
        { status: 400 }
      );
    }

    // Forward to backend API using proper URL construction
    const backendUrl = getApiBaseUrl();
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    const uploadUrl = buildUrl('/files/upload');
    console.log('[API/files/upload] Uploading to:', uploadUrl);

    const backendResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Upload thất bại' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/files/upload] Error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi tải lên' },
      { status: 500 }
    );
  }
}

