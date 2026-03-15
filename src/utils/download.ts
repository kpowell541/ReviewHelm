import { Platform } from 'react-native';
import { api } from '../api/client';

/**
 * Download a file from an opaque app-domain URL.
 *
 * The backend returns download URLs like `/api/v1/downloads/:token` rather
 * than raw S3 presigned URLs. This keeps storage implementation details
 * opaque and ensures all downloads go through authenticated, auditable
 * endpoints.
 *
 * On web: triggers a browser download via a temporary anchor element.
 * On native: returns the blob URL for further handling (e.g. expo-sharing).
 */

export interface DownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
}

/**
 * Fetch a downloadable file from an app-domain download path.
 * The path should be relative to the API base (e.g. `/downloads/:token`).
 */
export async function fetchDownload(path: string): Promise<DownloadResult> {
  const token = await (await import('../store/useAuthStore')).useAuthStore.getState().getAccessToken();

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH ?? '';
  const url = `${API_BASE_URL}${API_BASE_PATH}${path}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new DownloadError('File not found or link has expired.', 'NOT_FOUND');
    }
    if (response.status === 202) {
      throw new DownloadError(
        'This file is being restored from archive. Please try again in a few minutes.',
        'RESTORE_PENDING',
      );
    }
    throw new DownloadError(`Download failed (${response.status})`, 'DOWNLOAD_FAILED');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] ?? 'download';
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';

  return { blob, filename, contentType };
}

/**
 * Trigger a browser download for a blob.
 * Only works on web — on native, use expo-sharing instead.
 */
export function triggerBrowserDownload(result: DownloadResult): void {
  if (Platform.OS !== 'web') return;

  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export class DownloadError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'RESTORE_PENDING' | 'DOWNLOAD_FAILED',
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

/**
 * Check the status of an archived resource restore.
 * Returns the restore status from the backend.
 */
export async function checkRestoreStatus(
  resourceType: 'pr' | 'session',
  resourceId: string,
): Promise<{ status: 'pending' | 'restoring' | 'available'; estimatedMinutes?: number }> {
  return api.get(`/archives/${resourceType}/${resourceId}/status`);
}

/**
 * Request a restore of an archived resource.
 */
export async function requestRestore(
  resourceType: 'pr' | 'session',
  resourceId: string,
): Promise<{ status: 'restoring'; estimatedMinutes: number }> {
  return api.post(`/archives/${resourceType}/${resourceId}/restore`);
}
