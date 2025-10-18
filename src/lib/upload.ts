import { supabase } from './supabase';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_KYC_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for KYC documents
const MAX_AVATAR_SIZE_BYTES = 1 * 1024 * 1024; // 1MB for avatars

// Utility to format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- File Validation Functions ---
interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de imagem inválido. Apenas JPEG, PNG e WebP são permitidos.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: `O tamanho da imagem excede o limite de ${formatFileSize(MAX_IMAGE_SIZE_BYTES)}.` };
  }
  return { valid: true };
}

export function validateVideoFile(file: File): FileValidationResult {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']; // MP4, WebM, MOV, AVI
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de vídeo inválido. Apenas MP4, WebM, MOV e AVI são permitidos.' };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return { valid: false, error: `O tamanho do vídeo excede o limite de ${formatFileSize(MAX_VIDEO_SIZE_BYTES)}.` };
  }
  return { valid: true };
}

export function validateDocumentFile(file: File): FileValidationResult {
  const allowedTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de documento inválido. Apenas PDF, DOCX, XLSX, TXT, ZIP, RAR são permitidos.' };
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { valid: false, error: `O tamanho do documento excede o limite de ${formatFileSize(MAX_DOCUMENT_SIZE_BYTES)}.` };
  }
  return { valid: true };
}

export function validateKycDocumentFile(file: File): FileValidationResult {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo KYC inválido. Apenas PDF, JPEG e PNG são permitidos.' };
  }
  if (file.size > MAX_KYC_DOCUMENT_SIZE_BYTES) {
    return { valid: false, error: `O tamanho do documento KYC excede o limite de ${formatFileSize(MAX_KYC_DOCUMENT_SIZE_BYTES)}.` };
  }
  return { valid: true };
}

export function validateAvatarFile(file: File): FileValidationResult {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de avatar inválido. Apenas JPEG, PNG e WebP são permitidos.' };
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { valid: false, error: `O tamanho do avatar excede o limite de ${formatFileSize(MAX_AVATAR_SIZE_BYTES)}.` };
  }
  return { valid: true };
}

// --- Upload Functions ---
interface UploadResult {
  data?: { url: string; path: string };
  error?: Error;
}

async function uploadFileToSupabase(
  file: File,
  userId: string,
  bucket: string,
  folder: string
): Promise<UploadResult> {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
  const filePath = `${folder}/${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error(`[uploadFileToSupabase] Error uploading to ${bucket}/${folder}:`, error);
    return { error: new Error(`Falha ao fazer upload do arquivo: ${error.message}`) };
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { error: new Error('Não foi possível obter a URL pública do arquivo.') };
  }

  return { data: { url: publicUrlData.publicUrl, path: filePath } };
}

export async function uploadContentImage(file: File, userId: string): Promise<UploadResult> {
  return uploadFileToSupabase(file, userId, 'content_images', 'images');
}

export async function uploadContentVideo(file: File, userId: string): Promise<UploadResult> {
  return uploadFileToSupabase(file, userId, 'content_videos', 'videos');
}

export async function uploadContentDocument(file: File, userId: string): Promise<UploadResult> {
  return uploadFileToSupabase(file, userId, 'content_documents', 'documents');
}

export async function uploadKycDocument(file: File, userId: string): Promise<UploadResult> {
  return uploadFileToSupabase(file, userId, 'kyc_documents', 'documents');
}

export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  return uploadFileToSupabase(file, userId, 'avatars', 'avatars');
}

// --- Video Thumbnail Generation and Upload ---
interface ThumbnailResult {
  data?: Blob;
  error?: string;
}

export async function generateVideoThumbnail(videoFile: File): Promise<ThumbnailResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.currentTime = 1; // Capture thumbnail at 1 second mark

    video.onloadeddata = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ error: 'Não foi possível obter o contexto do canvas.' });
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ data: blob });
          } else {
            resolve({ error: 'Falha ao gerar blob da thumbnail.' });
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.8); // JPEG format with 80% quality
      } catch (err) {
        console.error('Error generating video thumbnail:', err);
        resolve({ error: 'Erro ao gerar thumbnail do vídeo.' });
      }
    };

    video.onerror = (err) => {
      console.error('Error loading video for thumbnail generation:', err);
      resolve({ error: 'Erro ao carregar vídeo para gerar thumbnail.' });
      URL.revokeObjectURL(video.src);
    };
  });
}

export async function uploadVideoThumbnail(
  thumbnailBlob: Blob,
  userId: string,
  videoFilePath: string
): Promise<UploadResult> {
  const videoFileName = videoFilePath.split('/').pop()?.split('.')[0];
  const thumbnailFileName = `${videoFileName}-thumbnail.jpeg`;
  const thumbnailPath = `thumbnails/${userId}/${thumbnailFileName}`;

  const { data, error } = await supabase.storage
    .from('content_videos') // Store thumbnails in the same bucket as videos
    .upload(thumbnailPath, thumbnailBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('[uploadVideoThumbnail] Error uploading thumbnail:', error);
    return { error: new Error(`Falha ao fazer upload da thumbnail: ${error.message}`) };
  }

  const { data: publicUrlData } = supabase.storage.from('content_videos').getPublicUrl(thumbnailPath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { error: new Error('Não foi possível obter a URL pública da thumbnail.') };
  }

  return { data: { url: publicUrlData.publicUrl, path: thumbnailPath } };
}
