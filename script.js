const SUPABASE_URL = 'https://emtddcurmnmvbhgysldh.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7DhFAC_g6N3sQE2tf1ZWIg_UvaDzmjY';
    const GALLERY_BUCKET = 'galeria-trabajos';
    const GALLERY_TABLE = 'trabajos';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let isAdminMode = false;
    document.body.classList.toggle('admin-mode', isAdminMode);
    const qrApiBase = 'https://api.qrserver.com/v1/create-qr-code/';
    const demoItems = [
      {
        title: 'Terminacion limpia en interior',
        description: 'Proyecto presentado con lineas ordenadas, buen acabado y una entrega lista para revisar con el cliente.',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85'
      },
      {
        title: 'Detalle profesional de instalacion',
        description: 'Trabajo enfocado en precision, limpieza del area y resultado final prolijo para generar confianza.',
        image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=85'
      },
      {
        title: 'Resultado final para cliente',
        description: 'Imagen destacada para mostrar avances, antes y despues o proyectos terminados con buena presencia visual.',
        image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=85'
      }
    ];

    const featuredImage = document.getElementById('featuredImage');
    const featuredTitle = document.getElementById('featuredTitle');
    const featuredDescription = document.getElementById('featuredDescription');
    const galleryGrid = document.getElementById('galleryGrid');
    const totalCount = document.getElementById('totalCount');
    const emptyState = document.getElementById('emptyState');
    const photoForm = document.getElementById('photoForm');
    const photoInput = document.getElementById('photoInput');
    const titleInput = document.getElementById('titleInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const fileLabel = document.getElementById('fileLabel');
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

    let works = [];
    let activeIndex = 0;
    let toastTimer;
    let touchStartX = 0;
    let touchStartY = 0;

    function explainAuthError(message) {
      const lower = String(message || '').toLowerCase();
      if (lower.includes('invalid login credentials')) return 'Correo o contrasena incorrectos. Revisa que el usuario exista en este proyecto y que la contrasena sea la misma.';
      if (lower.includes('email not confirmed')) return 'El correo existe, pero falta confirmar el usuario en Supabase Authentication.';
      if (lower.includes('invalid api key')) return 'La clave publica de Supabase no corresponde a este proyecto.';
      return message || 'Error desconocido de Supabase.';
    }

   function syncMode() {
      document.body.classList.toggle('admin-mode', isAdminMode);
      modeToggle.textContent = isAdminMode ? 'Vista cliente' : 'Modo admin';
      
      // Siempre usa la URL base limpia
      const cleanUrl = window.location.origin + window.location.pathname;
      
      // Corregido: usamos cleanUrl en lugar de nextUrl
      history.replaceState(null, '', cleanUrl); 
      
      if (qrUrlInput) qrUrlInput.value = cleanUrl;
      if (projectMessage) projectMessage.textContent = 'Conectado a Supabase: ' + SUPABASE_URL.replace('https://', '');
    }

    modeToggle.addEventListener('click', () => {
      isAdminMode = !isAdminMode;
      syncMode();
      showToast(isAdminMode ? 'Modo administrador activo' : 'Vista cliente activa');
    });
    function mapTrabajo(row) {
      return {
        id: row.id,
        title: row.titulo,
        description: row.descripcion || '',
        image: row.image_url,
        path: row.image_path,
        order: row.orden || 0
      };
    }

    async function loadWorks() {
      const { data, error } = await supabaseClient
        .from(GALLERY_TABLE)
        .select('id,titulo,descripcion,image_url,image_path,orden,activo,created_at')
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
    }

    async function refreshAuthState() {
      const { data } = await supabaseClient.auth.getSession();
      document.body.classList.toggle('is-authenticated', Boolean(data.session));
    }

    function showToast(message) {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
    }

    function animateFeatured() {
      featuredImage.classList.remove('zooming');
      void featuredImage.offsetWidth;
      featuredImage.classList.add('zooming');
      setTimeout(() => featuredImage.classList.remove('zooming'), 760);
    }

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
      }, 550);
    }

    function updateLightboxImage() {
      if (!works.length) return;
      const item = works[activeIndex];
      lightboxImage.src = item.image;
      lightboxImage.alt = item.title || 'Imagen en vista completa';
      lightboxCaption.textContent = item.title || '';
      lightboxCounter.textContent = (activeIndex + 1) + ' / ' + works.length;
    }

    function openLightbox() {
      if (!works.length || !featuredImage.src) return;
      updateLightboxImage();
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function moveLightbox(direction) {
      if (!works.length) return;
      setFeatured(activeIndex + direction);
      updateLightboxImage();
    }

    function setFeatured(index) {
      if (!works.length) {
        featuredImage.removeAttribute('src');
        featuredImage.alt = 'Sin trabajos cargados';
        featuredTitle.textContent = 'Tu proximo trabajo destacado';
        featuredDescription.textContent = 'Agrega una foto con descripcion para verla en este espacio principal.';
        totalCount.textContent = '0';
        emptyState.style.display = 'block';
        return;
      }

      activeIndex = (index + works.length) % works.length;
      const item = works[activeIndex];
      featuredImage.src = item.image;
      featuredImage.alt = item.title;
      featuredTitle.textContent = item.title;
      featuredDescription.textContent = item.description;
      totalCount.textContent = works.length;
      emptyState.style.display = 'none';
      animateFeatured();
      renderGallery();
    }

    function renderGallery() {
      galleryGrid.innerHTML = '';
      works.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'work-card' + (index === activeIndex ? ' active' : '');
        card.tabIndex = 0;
        card.setAttribute('aria-label', 'Ver ' + item.title);
        card.innerHTML = `
          <button class="card-remove" type="button" title="Eliminar" aria-label="Eliminar trabajo">x</button>
          <img src="${item.image}" alt="${item.title}">
          <div class="card-info">
            <strong>${item.title}</strong>
            <span>${item.description}</span>
          </div>
        `;

        card.addEventListener('click', () => setFeatured(index));
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setFeatured(index);
          }
        });
        card.querySelector('.card-remove').addEventListener('click', (event) => {
          event.stopPropagation();
          removeWork(index);
        });
        galleryGrid.appendChild(card);
      });
    }

    async function removeWork(index) {
      const removed = works[index];
      if (!removed || !confirm('Deseas eliminar este trabajo de Supabase?')) return;

      const { error } = await supabaseClient
        .from(GALLERY_TABLE)
        .delete()
        .eq('id', removed.id);

      if (error) {
        console.error('Error eliminando trabajo:', error);
        showToast('No se pudo eliminar el trabajo');
        return;
      }

      if (removed.path) {
        await supabaseClient.storage.from(GALLERY_BUCKET).remove([removed.path]);
      }

      await loadWorks();
      showToast('Trabajo eliminado: ' + removed.title);
    }

    async function addWorkFromFile(file, title, description) {
      try {
        setUploadProgress(12, 'Preparando imagen...');
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        const filePath = `${Date.now()}-${safeName}`;

        setUploadProgress(35, 'Subiendo imagen a Supabase...');
        const { error: uploadError } = await supabaseClient.storage
          .from(GALLERY_BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        setUploadProgress(72, 'Guardando datos del trabajo...');
        const { data: publicData } = supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);
        const { error: insertError } = await supabaseClient.from(GALLERY_TABLE).insert({
          titulo: title,
          descripcion: description,
          image_path: filePath,
          image_url: publicData.publicUrl,
          orden: Date.now(),
          activo: true
        });

        if (insertError) throw insertError;

        setUploadProgress(100, 'Imagen lista');
        photoForm.reset();
        fileLabel.textContent = 'Seleccionar imagen';
        await loadWorks();
        hideUploadProgress();
        showToast('Foto agregada a Supabase');
      } catch (error) {
        console.error('Error subiendo trabajo:', error);
        hideUploadProgress();
        showToast('No se pudo guardar en Supabase');
      }
    }

    photoInput.addEventListener('change', () => {
      fileLabel.textContent = photoInput.files[0] ? photoInput.files[0].name : 'Seleccionar imagen';
    });

    photoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = photoInput.files[0];
      const title = titleInput.value.trim();
      const description = descriptionInput.value.trim();

      if (!file || !title || !description) {
        showToast('Completa imagen, titulo y descripcion');
        return;
      }

      await addWorkFromFile(file, title, description);
    });

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
      }
    }, { passive: true });

    document.getElementById('prevBtn').addEventListener('click', () => setFeatured(activeIndex - 1));
    document.getElementById('nextBtn').addEventListener('click', () => setFeatured(activeIndex + 1));
    document.getElementById('nextShortcut').addEventListener('click', () => setFeatured(activeIndex + 1));
    document.getElementById('addShortcut').addEventListener('click', () => photoInput.click());
    document.getElementById('qrShortcut').addEventListener('click', () => {
      qrPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      qrUrlInput.focus();
    });

    document.getElementById('loadDemo').addEventListener('click', async () => {
      const rows = demoItems.map((item, index) => ({
        titulo: item.title,
        descripcion: item.description,
        image_url: item.image,
        image_path: null,
        orden: index + 1,
        activo: true
      }));
      const { error } = await supabaseClient.from(GALLERY_TABLE).insert(rows);
      if (error) {
        console.error('Error restaurando ejemplos:', error);
        showToast('No se pudieron cargar ejemplos');
        return;
      }
      await loadWorks();
      showToast('Ejemplos agregados a Supabase');
    });

    function normalizeQrUrl(value) {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return 'https://' + trimmed;
    }

    function updateQrCode(silent = false) {
      // Obtenemos la URL base limpia sin parámetros (?admin=1)
      const cleanBaseUrl = window.location.origin + window.location.pathname;
      
      // Usamos el valor del input, y si está vacío, usamos la base limpia
      const url = normalizeQrUrl(qrUrlInput.value || cleanBaseUrl);
      
      if (!url) {
        showToast('Escribe la URL publica de la galeria');
        return;
      }
      
      const qrSrc = qrApiBase + '?size=420x420&format=png&data=' + encodeURIComponent(url);
      qrImage.src = qrSrc;
      downloadQr.href = qrSrc;
      
      qrNote.textContent = url.includes('127.0.0.1') || url.includes('localhost')
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
    document.getElementById('clearGallery').addEventListener('click', async () => {
      if (!confirm('Deseas desactivar todos los trabajos de la galeria?')) return;
      const { error } = await supabaseClient.from(GALLERY_TABLE).update({ activo: false }).eq('activo', true);
      if (error) {
        console.error('Error limpiando galeria:', error);
        showToast('No se pudo limpiar la galeria');
        return;
      }
      await loadWorks();
      showToast('Galeria limpiada');
    });

    loginBtn.addEventListener('click', async () => {
      const email = adminEmail.value.trim().toLowerCase();
      const password = adminPassword.value;
      if (!email || !password) {
        showToast('Ingresa correo y contrasena');
        return;
      }
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Error login:', error);
        loginMessage.textContent = 'No se pudo entrar: ' + explainAuthError(error.message);
        showToast('No se pudo entrar');
        return;
      }
      loginMessage.textContent = '';
      adminPassword.value = '';
      await refreshAuthState();
      showToast('Modo administrador activo');
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
      loginMessage.textContent = 'Te envie un enlace de acceso al correo. Abre ese enlace y volveras al modo administrador.';
      showToast('Enlace enviado');
    });

    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      await refreshAuthState();
      showToast('Sesion cerrada');
    });

    supabaseClient.auth.onAuthStateChange(() => refreshAuthState());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (lightbox.classList.contains('open')) {
        if (event.key === 'ArrowRight') moveLightbox(1);
        if (event.key === 'ArrowLeft') moveLightbox(-1);
        return;
      }
      if (event.key === 'ArrowRight') setFeatured(activeIndex + 1);
      if (event.key === 'ArrowLeft') setFeatured(activeIndex - 1);
    });

     if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
       navigator.serviceWorker.register('./service-worker.js');
    });
   }

    syncMode();
    updateQrCode(true);
    refreshAuthState();
    loadWorks();
