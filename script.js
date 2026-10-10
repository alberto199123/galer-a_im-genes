/* =====================================================
   MrGlass - Galeria de Trabajos
   Vidrieria y aluminio en Chillan
   ===================================================== */

// ----- Configuracion Supabase -----
// La publishable key es segura en el cliente SIEMPRE Y CUANDO
// tengas RLS (Row Level Security) activado en Supabase.
// Ver README.md para instrucciones de configuracion.
const SUPABASE_URL = 'https://emtddcurmnmvbhgysldh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7DhFAC_g6N3sQE2tf1ZWIg_UvaDzmjY';
const GALLERY_BUCKET = 'galeria-trabajos';
const GALLERY_TABLE = 'trabajos';
const WHATSAPP_NUMBER = '56986341138';
const WHATSAPP_DEFAULT_MSG = 'Hola MrGlass, vi tu galeria y quiero cotizar un trabajo';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ----- Estado -----
let isAdminMode = new URLSearchParams(window.location.search).get('admin') === '1'
  || sessionStorage.getItem('mrglass_admin') === '1';
let works = [];
let activeIndex = 0;
let currentFilter = 'all';
let toastTimer;
let touchStartX = 0;
let touchStartY = 0;
let isLoadingWorks = false;
let editingWorkId = null;  // null = modo agregar; UUID = modo editar

// ----- Referencias DOM -----
const featuredImage = document.getElementById('featuredImage');
const featuredTitle = document.getElementById('featuredTitle');
const featuredDescription = document.getElementById('featuredDescription');
const featuredCategory = document.getElementById('featuredCategory');
const galleryGrid = document.getElementById('galleryGrid');
const totalCount = document.getElementById('totalCount');
const emptyState = document.getElementById('emptyState');
const photoForm = document.getElementById('photoForm');
const photoInput = document.getElementById('photoInput');
const titleInput = document.getElementById('titleInput');
const descriptionInput = document.getElementById('descriptionInput');
const categoryInput = document.getElementById('categoryInput');
const fileLabel = document.getElementById('fileLabel');
const fileDropZone = document.getElementById('fileDropZone');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const previewRemove = document.getElementById('previewRemove');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');
const modeToggle = document.getElementById('modeToggle');
const qrUrlInput = document.getElementById('qrUrlInput');
const qrImage = document.getElementById('qrImage');
const downloadQr = document.getElementById('downloadQr');
const qrPanel = document.getElementById('qrPanel');
const qrNote = document.getElementById('qrNote');
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const magicLinkBtn = document.getElementById('magicLinkBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginMessage = document.getElementById('loginMessage');
const projectMessage = document.getElementById('projectMessage');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxQuote = document.getElementById('lightboxQuote');
const lightboxImg = document.getElementById('lightboxImage');
const filterChips = document.getElementById('filterChips');
const showcaseSkeleton = document.getElementById('showcaseSkeleton');
// Referencias de edicion
const formTitle = document.getElementById('formTitle');
const formCopy = document.getElementById('formCopy');
const formHeader = document.getElementById('formHeader');
const editBadge = document.getElementById('editBadge');
const fileHint = document.getElementById('fileHint');
const imageCurrentHint = document.getElementById('imageCurrentHint');
const imageCurrentLink = document.getElementById('imageCurrentLink');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const footerYear = document.getElementById('footerYear');
const footerAdminHint = document.getElementById('footerAdminHint');

// Modal generico
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

// ----- Constantes QR -----
const qrApiBase = 'https://api.qrserver.com/v1/create-qr-code/';

// ----- Categorias validas -----
const VALID_CATEGORIES = ['vidrios', 'aluminio', 'mamparas', 'espejos', 'otros'];
const CATEGORY_LABELS = {
  vidrios: 'Vidrios',
  aluminio: 'Aluminio',
  mamparas: 'Mamparas',
  espejos: 'Espejos',
  otros: 'Otros'
};

// =====================================================
// Utilidades de seguridad
// =====================================================

// Escapa texto para insertarlo en HTML de forma segura
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Valida que un archivo sea una imagen real por MIME type
function isValidImageFile(file) {
  if (!file) return false;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) return false;
  // Tamano maximo: 8MB
  if (file.size > 8 * 1024 * 1024) return false;
  return true;
}

// Genera un nombre seguro para Storage
function safeFileName(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// =====================================================
// Modal generico (reemplaza confirm/alert nativos)
// =====================================================

let modalConfirmHandler = null;

function showConfirmModal(title, body, confirmLabel) {
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalConfirm.textContent = confirmLabel || 'Confirmar';
  modalBackdrop.hidden = false;
  // focus inicial para accesibilidad
  setTimeout(() => modalCancel.focus(), 50);

  return new Promise((resolve) => {
    modalConfirmHandler = () => resolve(true);
    modalCancelHandler = () => resolve(false);
  });
}

let modalCancelHandler = null;

modalConfirm.addEventListener('click', () => {
  modalBackdrop.hidden = true;
  if (modalConfirmHandler) modalConfirmHandler();
  modalConfirmHandler = null;
  modalCancelHandler = null;
});

modalCancel.addEventListener('click', () => {
  modalBackdrop.hidden = true;
  if (modalCancelHandler) modalCancelHandler();
  modalConfirmHandler = null;
  modalCancelHandler = null;
});

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) {
    modalBackdrop.hidden = true;
    if (modalCancelHandler) modalCancelHandler();
    modalConfirmHandler = null;
    modalCancelHandler = null;
  }
});

// =====================================================
// Toast
// =====================================================

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// =====================================================
// Auth Supabase
// =====================================================

function explainAuthError(message) {
  const lower = String(message || '').toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Correo o contrasena incorrectos. Revisa que el usuario exista en este proyecto y que la contrasena sea la misma.';
  if (lower.includes('email not confirmed')) return 'El correo existe, pero falta confirmar el usuario en Supabase Authentication.';
  if (lower.includes('invalid api key')) return 'La clave publica de Supabase no corresponde a este proyecto.';
  return message || 'Error desconocido de Supabase.';
}

async function refreshAuthState() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    document.body.classList.toggle('is-authenticated', Boolean(data.session));
  } catch (err) {
    console.error('Error refrescando sesion:', err);
  }
}

// =====================================================
// Modo admin
// =====================================================

function syncMode() {
  document.body.classList.toggle('admin-mode', isAdminMode);
  modeToggle.textContent = isAdminMode ? 'Vista cliente' : 'Modo admin';

  // Persistir en sessionStorage para no perder el modo al navegar
  if (isAdminMode) {
    sessionStorage.setItem('mrglass_admin', '1');
  } else {
    sessionStorage.removeItem('mrglass_admin');
  }

  // Limpiar el ?admin=1 de la URL para no exponer el modo en shared links
  const cleanUrl = window.location.origin + window.location.pathname;
  history.replaceState(null, '', cleanUrl);

  if (qrUrlInput) qrUrlInput.value = cleanUrl;
  if (projectMessage) projectMessage.textContent = 'Conectado a Supabase: ' + SUPABASE_URL.replace('https://', '');
}

modeToggle.addEventListener('click', () => {
  isAdminMode = !isAdminMode;
  syncMode();
  showToast(isAdminMode ? 'Modo administrador activo' : 'Vista cliente activa');
});

// Atajo de teclado: Ctrl+Shift+A activa modo admin
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
    event.preventDefault();
    isAdminMode = !isAdminMode;
    syncMode();
    showToast(isAdminMode ? 'Modo administrador activo (Ctrl+Shift+A)' : 'Vista cliente activa');
  }
  // Escape en modales
  if (event.key === 'Escape' && !modalBackdrop.hidden) {
    modalBackdrop.hidden = true;
    if (modalCancelHandler) modalCancelHandler();
    modalConfirmHandler = null;
    modalCancelHandler = null;
  }
});

// Hint discreto en el footer: click activa admin tambien
footerAdminHint.addEventListener('click', () => {
  isAdminMode = !isAdminMode;
  syncMode();
  showToast(isAdminMode ? 'Modo administrador activo' : 'Vista cliente activa');
});

// =====================================================
// Datos de la galeria
// =====================================================

function mapTrabajo(row) {
  return {
    id: row.id,
    title: row.titulo || '',
    description: row.descripcion || '',
    image: row.image_url,
    path: row.image_path,
    category: VALID_CATEGORIES.includes(row.categoria) ? row.categoria : 'otros',
    order: row.orden || 0
  };
}

async function loadWorks() {
  if (isLoadingWorks) return;
  isLoadingWorks = true;
  showcaseSkeleton.classList.remove('hidden');

  try {
    const { data, error } = await supabaseClient
      .from(GALLERY_TABLE)
      .select('id,titulo,descripcion,image_url,image_path,categoria,orden,activo,created_at')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando galeria:', error);
      works = [];
      showToast('No se pudo cargar la galeria desde Supabase');
    } else {
      works = (data || []).map(mapTrabajo);
    }

    activeIndex = 0;
    setFeatured(0);
    renderGallery();
  } catch (err) {
    console.error('Excepcion cargando galeria:', err);
    works = [];
    setFeatured(0);
    renderGallery();
  } finally {
    isLoadingWorks = false;
    setTimeout(() => showcaseSkeleton.classList.add('hidden'), 200);
  }
}

// =====================================================
// Render seguro (sin innerHTML con datos externos)
// =====================================================

function animateFeatured() {
  featuredImage.classList.remove('zooming');
  void featuredImage.offsetWidth;
  featuredImage.classList.add('zooming');
  setTimeout(() => featuredImage.classList.remove('zooming'), 760);
}

function setFeatured(index) {
  const filtered = getFilteredWorks();

  if (!filtered.length) {
    featuredImage.removeAttribute('src');
    featuredImage.alt = 'Sin trabajos cargados';
    featuredTitle.textContent = 'Tu proximo trabajo destacado';
    featuredDescription.textContent = 'Agrega una foto con descripcion para verla en este espacio principal.';
    featuredCategory.textContent = '';
    totalCount.textContent = works.length;
    emptyState.style.display = works.length === 0 ? 'block' : 'none';
    if (works.length > 0) {
      // Hay trabajos pero el filtro no tiene resultados
      emptyState.style.display = 'block';
      emptyState.textContent = 'No hay trabajos en esta categoria todavia.';
    } else {
      emptyState.textContent = 'Todavia no hay trabajos cargados. Cuando el administrador suba el primer trabajo, aparecera aqui.';
    }
    return;
  }

  activeIndex = (index + filtered.length) % filtered.length;
  const item = filtered[activeIndex];
  featuredImage.src = item.image;
  featuredImage.alt = item.title;
  featuredTitle.textContent = item.title;
  featuredDescription.textContent = item.description;
  featuredCategory.textContent = CATEGORY_LABELS[item.category] || '';
  totalCount.textContent = works.length;
  emptyState.style.display = 'none';
  animateFeatured();
  renderGallery();
}

function getFilteredWorks() {
  if (currentFilter === 'all') return works;
  return works.filter(w => w.category === currentFilter);
}

function renderGallery() {
  // Limpiar sin innerHTML para evitar fugas de listeners
  while (galleryGrid.firstChild) galleryGrid.removeChild(galleryGrid.firstChild);

  const filtered = getFilteredWorks();

  filtered.forEach((item, index) => {
    const isActive = (index === activeIndex);

    const card = document.createElement('article');
    card.className = 'work-card' + (isActive ? ' active' : '');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Ver ' + item.title);

    // Badge categoria
    const catBadge = document.createElement('span');
    catBadge.className = 'card-category';
    catBadge.dataset.cat = item.category;
    catBadge.textContent = CATEGORY_LABELS[item.category] || 'Otros';
    card.appendChild(catBadge);

    // Boton editar (solo admin autenticado) - al lado del eliminar
    const editBtn = document.createElement('button');
    editBtn.className = 'card-edit';
    editBtn.type = 'button';
    editBtn.title = 'Editar';
    editBtn.setAttribute('aria-label', 'Editar trabajo ' + item.title);
    editBtn.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM2 14.121V18h3.879l9-9-3.879-3.879-9 9z"/></svg>';
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      startEditWork(works.indexOf(item));
    });
    card.appendChild(editBtn);

    // Boton eliminar (solo admin autenticado)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'card-remove';
    removeBtn.type = 'button';
    removeBtn.title = 'Eliminar';
    removeBtn.setAttribute('aria-label', 'Eliminar trabajo ' + item.title);
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      removeWork(works.indexOf(item));
    });
    card.appendChild(removeBtn);

    // Imagen
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.src = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
        '<rect width="400" height="300" fill="#ede8f4"/>' +
        '<text x="50%" y="50%" fill="#6b6478" font-family="sans-serif" font-size="14" text-anchor="middle">Imagen no disponible</text>' +
        '</svg>'
      );
      img.alt = 'Imagen no disponible';
    });
    card.appendChild(img);

    // Info
    const info = document.createElement('div');
    info.className = 'card-info';
    const strong = document.createElement('strong');
    strong.textContent = item.title;
    const span = document.createElement('span');
    span.textContent = item.description;
    info.appendChild(strong);
    info.appendChild(span);
    card.appendChild(info);

    // Boton cotizar
    const quoteLink = document.createElement('a');
    quoteLink.className = 'card-quote';
    quoteLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola MrGlass, vi el trabajo "' + item.title + '" en tu galeria y quiero cotizar algo similar')}`;
    quoteLink.target = '_blank';
    quoteLink.rel = 'noopener noreferrer';
    quoteLink.textContent = 'Cotizar';
    quoteLink.addEventListener('click', (e) => e.stopPropagation());
    card.appendChild(quoteLink);

    // Eventos de card
    card.addEventListener('click', () => setFeatured(index));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setFeatured(index);
      }
    });

    galleryGrid.appendChild(card);
  });
}

// =====================================================
// Upload
// =====================================================

function setUploadProgress(percent, text) {
  uploadProgress.classList.add('active');
  uploadProgressFill.style.width = Math.max(0, Math.min(100, percent)) + '%';
  uploadProgressText.textContent = text;
}

function hideUploadProgress() {
  setTimeout(() => {
    uploadProgress.classList.remove('active');
    uploadProgressFill.style.width = '0%';
    uploadProgressText.textContent = 'Preparando imagen...';
  }, 600);
}

// Preview de imagen al seleccionar
function showImagePreview(file) {
  if (!file || !isValidImageFile(file)) {
    imagePreview.hidden = true;
    previewImg.src = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    imagePreview.hidden = false;
  };
  reader.readAsDataURL(file);
}

function clearImagePreview() {
  imagePreview.hidden = true;
  previewImg.src = '';
  photoInput.value = '';
  fileLabel.textContent = 'Seleccionar imagen';
}

previewRemove.addEventListener('click', clearImagePreview);

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (file) {
    if (!isValidImageFile(file)) {
      showToast('Archivo invalido. Solo JPG, PNG o WEBP (max 8MB)');
      clearImagePreview();
      return;
    }
    fileLabel.textContent = file.name;
    showImagePreview(file);
  } else {
    fileLabel.textContent = 'Seleccionar imagen';
    imagePreview.hidden = true;
  }
});

// Drag & drop
['dragenter', 'dragover'].forEach(eventName => {
  fileDropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  fileDropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropZone.classList.remove('dragover');
  });
});

fileDropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length) {
    photoInput.files = files;
    photoInput.dispatchEvent(new Event('change'));
  }
});

// Submit: deshabilita boton, valida, sube
photoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = photoInput.files[0];
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const category = categoryInput.value;

  // Validacion comun (en modo edicion la imagen es opcional)
  if (!title || !description) {
    showToast('Completa titulo y descripcion');
    return;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    showToast('Selecciona una categoria valida');
    return;
  }
  // En modo agregar, la imagen es obligatoria
  if (!editingWorkId && !file) {
    showToast('Selecciona una imagen');
    return;
  }
  // Si subio archivo, validar que sea imagen valida
  if (file && !isValidImageFile(file)) {
    showToast('Archivo invalido. Solo JPG, PNG o WEBP (max 8MB)');
    return;
  }

  submitBtn.disabled = true;

  if (editingWorkId) {
    // MODO EDITAR
    submitBtn.textContent = 'Guardando...';
    await updateWork(editingWorkId, { file, title, description, category });
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar cambios';
  } else {
    // MODO AGREGAR
    submitBtn.textContent = 'Subiendo...';
    await addWorkFromFile(file, title, description, category);
    submitBtn.disabled = false;
    submitBtn.textContent = '+ Agregar a la galeria';
  }
});

// Cancelar edicion y volver a modo agregar
cancelEditBtn.addEventListener('click', () => {
  cancelEdit();
});

function startEditWork(index) {
  const item = works[index];
  if (!item) return;

  editingWorkId = item.id;

  // Cargar datos en el formulario
  titleInput.value = item.title;
  descriptionInput.value = item.description;
  categoryInput.value = VALID_CATEGORIES.includes(item.category) ? item.category : 'otros';

  // Imagen: no exigir nueva; mostrar hint con link a la actual
  photoInput.removeAttribute('required');
  fileLabel.textContent = 'Seleccionar nueva imagen (opcional)';
  fileHint.textContent = 'Solo sube una nueva imagen si quieres reemplazar la actual.';
  imageCurrentHint.hidden = false;
  imageCurrentLink.href = item.image;
  imagePreview.hidden = true;
  previewImg.src = '';

  // UI: cambiar titulos y mostrar badge + boton cancelar
  formTitle.textContent = 'Editar trabajo';
  formCopy.textContent = 'Modifica los campos que quieras actualizar. La imagen es opcional: si no subes una nueva, se mantiene la actual.';
  editBadge.hidden = false;
  submitBtn.textContent = 'Guardar cambios';
  cancelEditBtn.hidden = false;

  // Scroll al formulario (util en mobile)
  document.getElementById('photoForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  titleInput.focus();
  showToast('Editando: ' + item.title);
}

function cancelEdit() {
  editingWorkId = null;
  photoForm.reset();
  clearImagePreview();
  photoInput.setAttribute('required', '');
  fileLabel.textContent = 'Seleccionar imagen';
  fileHint.textContent = 'JPG, PNG o WEBP. Arrastra tu foto aqui o haz click.';
  imageCurrentHint.hidden = true;
  imageCurrentLink.href = '#';
  formTitle.textContent = 'Agregar trabajo';
  formCopy.textContent = 'Carga una imagen, escribe un titulo claro, elige la categoria y suma una descripcion breve.';
  editBadge.hidden = true;
  submitBtn.textContent = '+ Agregar a la galeria';
  cancelEditBtn.hidden = true;
}

async function updateWork(workId, { file, title, description, category }) {
  try {
    setUploadProgress(15, 'Actualizando datos...');

    // Buscar el trabajo actual para saber image_path viejo
    const current = works.find(w => w.id === workId);
    if (!current) throw new Error('Trabajo no encontrado');

    let newImagePath = current.path;
    let newImageUrl = current.image;

    // Si el usuario subio una nueva imagen, subirla y preparar eliminacion de la vieja
    if (file) {
      setUploadProgress(35, 'Subiendo nueva imagen...');
      const filePath = safeFileName(file);
      const { error: uploadError } = await supabaseClient.storage
        .from(GALLERY_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);
      newImagePath = filePath;
      newImageUrl = publicData.publicUrl;
    }

    setUploadProgress(72, 'Guardando cambios en la base de datos...');
    const { error: updateError } = await supabaseClient
      .from(GALLERY_TABLE)
      .update({
        titulo: title,
        descripcion: description,
        categoria: category,
        image_path: newImagePath,
        image_url: newImageUrl
      })
      .eq('id', workId);

    if (updateError) throw updateError;

    // Si se subio imagen nueva Y habia una vieja con path, borrar la vieja de Storage
    if (file && current.path) {
      try {
        await supabaseClient.storage.from(GALLERY_BUCKET).remove([current.path]);
      } catch (e) {
        console.warn('No se pudo borrar la imagen vieja de Storage:', e);
      }
    }

    setUploadProgress(100, 'Cambios guardados');
    cancelEdit();
    await loadWorks();
    hideUploadProgress();
    showToast('Trabajo actualizado');
  } catch (error) {
    console.error('Error actualizando trabajo:', error);
    hideUploadProgress();
    const msg = error && error.message ? error.message : '';
    if (msg.includes('row-level security') || msg.includes('policy')) {
      showToast('Error: RLS bloquea la actualizacion. Verifica sesion y politicas.');
    } else {
      showToast('No se pudo actualizar el trabajo');
    }
  }
}

async function addWorkFromFile(file, title, description, category) {
  try {
    setUploadProgress(12, 'Preparando imagen...');
    const filePath = safeFileName(file);

    setUploadProgress(35, 'Subiendo imagen a Supabase...');
    const { error: uploadError } = await supabaseClient.storage
      .from(GALLERY_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    setUploadProgress(72, 'Guardando datos del trabajo...');
    const { data: publicData } = supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);
    const { error: insertError } = await supabaseClient.from(GALLERY_TABLE).insert({
      titulo: title,
      descripcion: description,
      categoria: category,
      image_path: filePath,
      image_url: publicData.publicUrl,
      orden: Date.now(),
      activo: true
    });

    if (insertError) {
      // Rollback: borrar el archivo subido si fallo el insert
      await supabaseClient.storage.from(GALLERY_BUCKET).remove([filePath]);
      throw insertError;
    }

    setUploadProgress(100, 'Imagen lista');
    photoForm.reset();
    clearImagePreview();
    await loadWorks();
    hideUploadProgress();
    showToast('Trabajo agregado a la galeria');
  } catch (error) {
    console.error('Error subiendo trabajo:', error);
    hideUploadProgress();
    const msg = error && error.message ? error.message : '';
    if (msg.includes('categoria')) {
      showToast('Error: falta la columna "categoria" en Supabase. Ejecuta la migracion (ver README.md)');
    } else if (msg.includes('row-level security') || msg.includes('policy')) {
      showToast('Error: RLS bloquea la escritura. Revisa las politicas en Supabase.');
    } else {
      showToast('No se pudo guardar en Supabase');
    }
  }
}

// =====================================================
// Eliminar trabajo (transaccion: storage primero, luego DB)
// =====================================================

async function removeWork(index) {
  const removed = works[index];
  if (!removed) return;

  const confirmed = await showConfirmModal(
    'Eliminar trabajo',
    `Seguro que quieres eliminar "${removed.title}"? Esta accion no se puede deshacer.`,
    'Si, eliminar'
  );
  if (!confirmed) return;

  try {
    // 1. Borrar archivo de Storage primero
    if (removed.path) {
      const { error: storageError } = await supabaseClient
        .storage
        .from(GALLERY_BUCKET)
        .remove([removed.path]);
      if (storageError) {
        console.warn('No se pudo borrar el archivo de Storage (continuamos con DB):', storageError);
      }
    }

    // 2. Borrar fila de la tabla
    const { error } = await supabaseClient
      .from(GALLERY_TABLE)
      .delete()
      .eq('id', removed.id);

    if (error) throw error;

    await loadWorks();
    showToast('Trabajo eliminado: ' + removed.title);
  } catch (error) {
    console.error('Error eliminando trabajo:', error);
    showToast('No se pudo eliminar el trabajo');
  }
}

// =====================================================
// Lightbox
// =====================================================

function updateLightboxImage() {
  const filtered = getFilteredWorks();
  if (!filtered.length) return;
  const item = filtered[activeIndex];
  lightboxImage.src = item.image;
  lightboxImage.alt = item.title || 'Imagen en vista completa';

  // Caption con titulo + descripcion
  while (lightboxCaption.firstChild) lightboxCaption.removeChild(lightboxCaption.firstChild);
  const titleNode = document.createElement('strong');
  titleNode.textContent = item.title || '';
  lightboxCaption.appendChild(titleNode);
  if (item.description) {
    const descNode = document.createElement('small');
    descNode.textContent = item.description;
    lightboxCaption.appendChild(descNode);
  }
  lightboxCounter.textContent = (activeIndex + 1) + ' / ' + filtered.length;

  // Configurar link de cotizacion del lightbox
  const msg = `Hola MrGlass, vi el trabajo "${item.title}" en tu galeria y quiero cotizar algo similar`;
  lightboxQuote.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function openLightbox() {
  const filtered = getFilteredWorks();
  if (!filtered.length || !featuredImage.src) return;
  updateLightboxImage();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus trap inicial
  setTimeout(() => lightboxClose.focus(), 50);
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function moveLightbox(direction) {
  if (!getFilteredWorks().length) return;
  setFeatured(activeIndex + direction);
  updateLightboxImage();
}

featuredImage.addEventListener('click', openLightbox);
lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', (event) => {
  event.stopPropagation();
  moveLightbox(-1);
});
lightboxNext.addEventListener('click', (event) => {
  event.stopPropagation();
  moveLightbox(1);
});
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

// Touch swipe en lightbox
lightbox.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

lightbox.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
    moveLightbox(deltaX < 0 ? 1 : -1);
  } else if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
    // Swipe down para cerrar
    closeLightbox();
  }
}, { passive: true });

// =====================================================
// Filtros
// =====================================================

filterChips.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  const filter = chip.dataset.filter;
  if (!filter) return;

  currentFilter = filter;
  activeIndex = 0;

  // Actualizar UI de chips
  filterChips.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c === chip);
    c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
  });

  setFeatured(0);
});

// =====================================================
// Navegacion
// =====================================================

document.getElementById('prevBtn').addEventListener('click', () => setFeatured(activeIndex - 1));
document.getElementById('nextBtn').addEventListener('click', () => setFeatured(activeIndex + 1));
document.getElementById('nextShortcut').addEventListener('click', () => setFeatured(activeIndex + 1));
document.getElementById('addShortcut').addEventListener('click', () => {
  if (editingWorkId) cancelEdit();
  photoInput.click();
});
document.getElementById('qrShortcut').addEventListener('click', () => {
  qrPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  qrUrlInput.focus();
});

// Teclado: navegacion con flechas
document.addEventListener('keydown', (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;
  if (modalBackdrop.hidden === false) return;

  if (event.key === 'Escape' && lightbox.classList.contains('open')) {
    closeLightbox();
    return;
  }
  if (lightbox.classList.contains('open')) {
    if (event.key === 'ArrowRight') moveLightbox(1);
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    return;
  }
  if (event.key === 'ArrowRight') setFeatured(activeIndex + 1);
  if (event.key === 'ArrowLeft') setFeatured(activeIndex - 1);
});

// =====================================================
// QR
// =====================================================

function normalizeQrUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

function updateQrCode(silent) {
  const cleanBaseUrl = window.location.origin + window.location.pathname;
  const url = normalizeQrUrl(qrUrlInput.value || cleanBaseUrl);

  if (!url) {
    showToast('Escribe la URL publica de la galeria');
    return;
  }

  const qrSrc = qrApiBase + '?size=420x420&format=png&data=' + encodeURIComponent(url);
  qrImage.src = qrSrc;
  qrImage.onerror = () => {
    qrNote.textContent = 'No se pudo generar el QR. Verifica tu conexion a internet.';
  };
  downloadQr.href = qrSrc;

  qrNote.textContent = (url.includes('127.0.0.1') || url.includes('localhost'))
    ? 'Este QR es solo para pruebas en este computador. Para clientes, reemplazalo por la URL publica cuando publiquemos la galeria.'
    : 'Este QR abrira directo la galeria publicada: ' + url;

  if (!silent) showToast('Codigo QR actualizado');
}

document.getElementById('generateQr').addEventListener('click', () => updateQrCode());
qrUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    updateQrCode();
  }
});

// =====================================================
// Login / Logout
// =====================================================

loginBtn.addEventListener('click', async () => {
  const email = adminEmail.value.trim().toLowerCase();
  const password = adminPassword.value;
  if (!email || !password) {
    showToast('Ingresa correo y contrasena');
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  loginBtn.disabled = false;
  loginBtn.textContent = 'Entrar';
  if (error) {
    console.error('Error login:', error);
    loginMessage.textContent = 'No se pudo entrar: ' + explainAuthError(error.message);
    showToast('No se pudo entrar');
    return;
  }
  loginMessage.textContent = '';
  adminPassword.value = '';
  await refreshAuthState();
  showToast('Sesion iniciada');
});

magicLinkBtn.addEventListener('click', async () => {
  const email = adminEmail.value.trim().toLowerCase();
  if (!email) {
    showToast('Ingresa tu correo');
    return;
  }
  const redirectTo = window.location.origin + window.location.pathname + '?admin=1';
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false
    }
  });
  if (error) {
    console.error('Error magic link:', error);
    loginMessage.textContent = 'No se pudo enviar enlace: ' + explainAuthError(error.message);
    showToast('No se pudo enviar enlace');
    return;
  }
  loginMessage.textContent = 'Te enviamos un enlace de acceso al correo. Abre ese enlace y volveras al modo administrador.';
  showToast('Enlace enviado');
});

logoutBtn.addEventListener('click', async () => {
  if (editingWorkId) cancelEdit();
  await supabaseClient.auth.signOut();
  await refreshAuthState();
  showToast('Sesion cerrada');
});

supabaseClient.auth.onAuthStateChange(() => refreshAuthState());

// =====================================================
// Service Worker (PWA)
// =====================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  });
}

// =====================================================
// Init
// =====================================================

footerYear.textContent = new Date().getFullYear();
syncMode();
updateQrCode(true);
refreshAuthState();
loadWorks();
