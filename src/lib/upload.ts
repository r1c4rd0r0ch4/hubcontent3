import { supabase } from './supabase'; // Assumindo que o cliente supabase é exportado daqui

// Função utilitária para formatar o tamanho do arquivo
export function formatFileSize(bytes: number, dp = 2) {
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let u = -1;
  const r = 10 ** dp;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  return bytes.toFixed(dp) + ' ' + units[u];
}

// Tamanhos máximos de arquivo
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Funções de validação de arquivo
export function validateImageFile(file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de imagem inválido. Apenas JPEG, PNG, WebP são permitidos.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `O tamanho da imagem excede o limite de ${formatFileSize(MAX_IMAGE_SIZE)}.` };
  }
  return { valid: true };
}

export function validateVideoFile(file: File) {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']; // .mov, .avi, .webm
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de vídeo inválido. Apenas MP4, MOV, AVI, WebM são permitidos.' };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `O tamanho do vídeo excede o limite de ${formatFileSize(MAX_VIDEO_SIZE)}.` };
  }
  return { valid: true };
}

export function validateDocumentFile(file: File) {
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
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { valid: false, error: `O tamanho do documento excede o limite de ${formatFileSize(MAX_DOCUMENT_SIZE)}.` };
  }
  return { valid: true };
}

// Funções de upload genéricas
async function uploadFile(bucketName: string, file: File, userId: string, folder: string) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/${folder}/${crypto.randomUUID()}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadContentImage(file: File, userId: string) {
  return uploadFile('content-images', file, userId, 'images');
}

export async function uploadContentVideo(file: File, userId: string) {
  return uploadFile('content-videos', file, userId, 'videos');
}

export async function uploadContentDocument(file: File, userId: string) {
  return uploadFile('content-documents', file, userId, 'documents');
}

// Função para upload de avatares
export async function uploadAvatar(file: File, userId: string) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExtension}`; // Nome fixo para avatar por usuário

  const { data, error } = await supabase.storage
    .from('avatars') // Bucket específico para avatares
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Permite sobrescrever o avatar existente
    });

  if (error) {
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: fileName,
    },
    error: null,
  };
}

// Nova função para upload de documentos KYC
export async function uploadKycDocument(file: File, userId: string, documentType: string) {
  const fileExtension = file.name.split('.').pop();
  // Path: user_id/document_type/uuid.extension
  const fileName = `${userId}/${documentType}/${crypto.randomUUID()}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from('kyc-documents') // Bucket específico para KYC
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { data: null, error };
  }

  // Documentos KYC não devem ter URL pública por padrão, mas a função getPublicUrl é usada para obter o path completo
  // O acesso real será controlado por RLS e talvez uma função de servidor para download seguro.
  const { data: publicUrlData } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);

  return {
    data: {
      url: publicUrlData.publicUrl, // Esta URL pode não ser acessível diretamente sem autenticação
      path: fileName,
    },
    error: null,
  };
}


// Geração e upload de thumbnail de vídeo
export async function generateVideoThumbnail(videoFile: File): Promise<{ data: Blob | null; error: string | null }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.currentTime = 1; // Captura o frame no 1º segundo
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ data: blob, error: null });
          } else {
            resolve({ data: null, error: 'Falha ao criar o blob da thumbnail.' });
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.8); // Formato JPEG com 80% de qualidade
      } else {
        resolve({ data: null, error: 'Falha ao obter o contexto do canvas.' });
      }
    };
    video.onerror = (e) => {
      console.error('Erro de vídeo durante a geração da thumbnail:', e);
      resolve({ data: null, error: 'Falha ao carregar o vídeo para geração da thumbnail.' });
      URL.revokeObjectURL(video.src);
    };
  });
}

export async function uploadVideoThumbnail(thumbnailBlob: Blob, userId: string, videoFilePath: string) {
  const thumbnailFileName = videoFilePath.replace(/\.[^/.]+$/, "") + '.thumb.jpeg'; // Ex: user_id/videos/uuid.mp4 -> user_id/videos/uuid.thumb.jpeg

  const { data, error } = await supabase.storage
    .from('content-videos') // Armazena as thumbnails no mesmo bucket dos vídeos
    .upload(thumbnailFileName, thumbnailBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from('content-videos').getPublicUrl(thumbnailFileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: thumbnailFileName,
    },
    error: null,
  };
}
