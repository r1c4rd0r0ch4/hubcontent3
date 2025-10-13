import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadError {
  message: string;
  code?: string;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', // Allow images for KYC documents
];

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      data: null,
      error: { message: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' },
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      data: null,
      error: { message: 'A imagem deve ter no máximo 2MB.' },
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload da imagem.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return {
    data: {
      url: publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadContentImage(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      data: null,
      error: { message: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' },
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      data: null,
      error: { message: 'A imagem deve ter no máximo 2MB.' },
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/content-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('content-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload da imagem.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('content-images')
    .getPublicUrl(fileName);

  return {
    data: {
      url: publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadContentVideo(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      data: null,
      error: { message: 'Formato de vídeo não suportado. Use MP4, MOV, AVI ou WebM.' },
    };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return {
      data: null,
      error: { message: 'O vídeo deve ter no máximo 50MB.' },
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/video-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('content-videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload do vídeo.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('content-videos')
    .getPublicUrl(fileName);

  return {
    data: {
      url: publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadContentDocument(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      data: null,
      error: { message: 'Formato de documento não suportado. Use PDF, DOCX, XLSX, TXT, ZIP, etc.' },
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      data: null,
      error: { message: `O documento deve ter no máximo ${formatFileSize(MAX_DOCUMENT_SIZE)}.` },
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/document-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('content-documents') // New bucket for documents
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload do documento.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('content-documents')
    .getPublicUrl(fileName);

  return {
    data: {
      url: publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadKycDocument(
  file: File,
  userId: string,
  documentType: string // e.g., 'id_front', 'proof_of_address'
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      data: null,
      error: { message: 'Formato de documento não suportado. Use JPEG, PNG, WebP ou PDF.' },
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      data: null,
      error: { message: `O documento deve ter no máximo ${formatFileSize(MAX_DOCUMENT_SIZE)}.` },
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${documentType}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('kyc-documents') // Dedicated bucket for KYC documents
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload do documento KYC.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('kyc-documents')
    .getPublicUrl(fileName);

  return {
    data: {
      url: publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function deleteFile(bucket: 'avatars' | 'content-images' | 'content-videos' | 'content-documents' | 'kyc-documents', path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  return !error;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `A imagem deve ter no máximo ${formatFileSize(MAX_IMAGE_SIZE)}. Tamanho atual: ${formatFileSize(file.size)}` };
  }
  return { valid: true };
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato de vídeo não suportado. Use MP4, MOV, AVI ou WebM.' };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `O vídeo deve ter no máximo ${formatFileSize(MAX_VIDEO_SIZE)}. Tamanho atual: ${formatFileSize(file.size)}` };
  }
  return { valid: true };
}

export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato de documento não suportado. Use PDF, DOCX, XLSX, TXT, ZIP, etc.' };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { valid: false, error: `O documento deve ter no máximo ${formatFileSize(MAX_DOCUMENT_SIZE)}. Tamanho atual: ${formatFileSize(file.size)}` };
  }
  return { valid: true };
}

export async function generateVideoThumbnail(
  videoFile: File
): Promise<{ data: Blob | null; error: string | null }> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ data: null, error: 'Canvas não suportado' });
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of video duration, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        // Set canvas dimensions to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            if (blob) {
              resolve({ data: blob, error: null });
            } else {
              resolve({ data: null, error: 'Erro ao gerar thumbnail' });
            }
          },
          'image/jpeg',
          0.8
        );
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ data: null, error: 'Erro ao carregar vídeo' });
      };

      // Load video
      video.src = URL.createObjectURL(videoFile);
    } catch (error) {
      resolve({ data: null, error: 'Erro ao processar vídeo' });
    }
  });
}

export async function uploadVideoThumbnail(
  thumbnailBlob: Blob,
  userId: string,
  videoFileName: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  const thumbnailFileName = `${userId}/thumb-${videoFileName.split('/').pop()?.replace(/\.[^.]+$/, '')}.jpg`;

  const { data, error } = await supabase.storage
    .from('content-images')
    .upload(thumbnailFileName, thumbnailBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    return {
      data: null,
      error: { message: 'Erro ao fazer upload da thumbnail.', code: error.message },
    };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('content-images')
    .getPublicUrl(thumbnailFileName);

  return {
    data: {
      url: publicUrl,
      path: thumbnailFileName,
    },
    error: null,
  };
}
