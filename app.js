(() => {
  const config = window.OPTICA_AR_CONFIG || {};
  const hasSupabaseCredentials = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
  const supabaseClient = hasSupabaseCredentials
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;

  const state = {
    glasses: [],
    filtered: [],
    selected: null,
    camera: null,
    faceMesh: null,
    cameraStarted: false,
    latestResults: null,
    selectedImage: null,
    processingFrame: false,
    adjustment: {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    adminUnlocked: false,
  };

  const els = {};
  const LS_KEY = "optica_ar_vision_glasses";

  const demoGlasses = [
    {
      id: "demo-1",
      name: "Marco clásico azul",
      category: "Ópticos",
      original_image_url: "",
      processed_image_url: createDemoGlassesSvg("#0f2742", "#25b8ff"),
      is_active: true,
      offset_x: 0,
      offset_y: 0,
      scale: 1,
      rotation: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-2",
      name: "Lente premium dorado",
      category: "Premium",
      original_image_url: "",
      processed_image_url: createDemoGlassesSvg("#5b3a12", "#f4c76b"),
      is_active: true,
      offset_x: 0,
      offset_y: 0,
      scale: 1,
      rotation: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-3",
      name: "Sol urbano oscuro",
      category: "Sol",
      original_image_url: "",
      processed_image_url: createDemoGlassesSvg("#111827", "#475569", true),
      is_active: true,
      offset_x: 0,
      offset_y: 0,
      scale: 1,
      rotation: 0,
      created_at: new Date().toISOString(),
    },
  ];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    loadGlasses();
    drawIdleCanvas();
    setStatus(els.cameraMessage, hasSupabaseCredentials ? "Supabase conectado. Los diseños se guardarán en la nube." : "Modo demo/local: configura js/config.js para guardar en Supabase.");
    document.getElementById("year").textContent = new Date().getFullYear();
  }

  function cacheElements() {
    Object.assign(els, {
      menuToggle: document.getElementById("menuToggle"),
      mainNav: document.getElementById("mainNav"),
      searchInput: document.getElementById("searchInput"),
      categoryFilter: document.getElementById("categoryFilter"),
      catalogGrid: document.getElementById("catalogGrid"),
      catalogEmpty: document.getElementById("catalogEmpty"),
      tryonList: document.getElementById("tryonList"),
      selectedGlassesCard: document.getElementById("selectedGlassesCard"),
      statTotalGlasses: document.getElementById("statTotalGlasses"),
      video: document.getElementById("cameraVideo"),
      canvas: document.getElementById("arCanvas"),
      cameraPlaceholder: document.getElementById("cameraPlaceholder"),
      startCameraBtn: document.getElementById("startCameraBtn"),
      stopCameraBtn: document.getElementById("stopCameraBtn"),
      captureBtn: document.getElementById("captureBtn"),
      cameraMessage: document.getElementById("cameraMessage"),
      offsetX: document.getElementById("offsetX"),
      offsetY: document.getElementById("offsetY"),
      scaleRange: document.getElementById("scaleRange"),
      rotationRange: document.getElementById("rotationRange"),
      opacityRange: document.getElementById("opacityRange"),
      autoCenterBtn: document.getElementById("autoCenterBtn"),
      adminLogin: document.getElementById("adminLogin"),
      adminPanel: document.getElementById("adminPanel"),
      adminPasscode: document.getElementById("adminPasscode"),
      adminLoginBtn: document.getElementById("adminLoginBtn"),
      uploadForm: document.getElementById("uploadForm"),
      glassesName: document.getElementById("glassesName"),
      glassesCategory: document.getElementById("glassesCategory"),
      glassesFile: document.getElementById("glassesFile"),
      isActive: document.getElementById("isActive"),
      uploadPreview: document.getElementById("uploadPreview"),
      previewPlaceholder: document.getElementById("previewPlaceholder"),
      uploadStatus: document.getElementById("uploadStatus"),
      adminList: document.getElementById("adminList"),
      refreshAdminBtn: document.getElementById("refreshAdminBtn"),
    });
  }

  function bindEvents() {
    els.menuToggle.addEventListener("click", () => els.mainNav.classList.toggle("open"));
    document.querySelectorAll(".nav a").forEach((link) => {
      link.addEventListener("click", () => els.mainNav.classList.remove("open"));
    });

    window.addEventListener("hashchange", highlightNav);
    highlightNav();

    els.searchInput.addEventListener("input", applyFilters);
    els.categoryFilter.addEventListener("change", applyFilters);
    els.startCameraBtn.addEventListener("click", startCamera);
    els.stopCameraBtn.addEventListener("click", stopCamera);
    els.captureBtn.addEventListener("click", capturePhoto);
    els.autoCenterBtn.addEventListener("click", resetAdjustments);

    [els.offsetX, els.offsetY, els.scaleRange, els.rotationRange, els.opacityRange].forEach((input) => {
      input.addEventListener("input", updateAdjustmentFromInputs);
    });

    els.adminLoginBtn.addEventListener("click", unlockAdmin);
    els.adminPasscode.addEventListener("keydown", (event) => {
      if (event.key === "Enter") unlockAdmin();
    });
    els.glassesFile.addEventListener("change", previewUpload);
    els.uploadForm.addEventListener("submit", handleUpload);
    els.refreshAdminBtn.addEventListener("click", loadGlasses);
  }

  function highlightNav() {
    const hash = window.location.hash || "#inicio";
    document.querySelectorAll(".nav a").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === hash));
  }

  async function loadGlasses() {
    try {
      if (hasSupabaseCredentials && config.USE_SUPABASE !== false) {
        const { data, error } = await supabaseClient
          .from("glasses")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        state.glasses = data || [];
      } else {
        const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        state.glasses = local.length ? local : demoGlasses;
      }
    } catch (error) {
      console.error(error);
      setStatus(els.cameraMessage, `No se pudo cargar Supabase: ${error.message}. Se mostrará demo/local.`, "error");
      const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      state.glasses = local.length ? local : demoGlasses;
    }

    applyFilters();
    renderAdminList();
    if (!state.selected && state.glasses.find((item) => item.is_active)) {
      selectGlasses(state.glasses.find((item) => item.is_active));
    }
    els.statTotalGlasses.textContent = String(state.glasses.length);
  }

  function applyFilters() {
    const q = els.searchInput.value.trim().toLowerCase();
    const cat = els.categoryFilter.value;
    state.filtered = state.glasses.filter((item) => {
      const active = item.is_active !== false;
      const matchesText = !q || item.name.toLowerCase().includes(q);
      const matchesCategory = cat === "all" || item.category === cat;
      return active && matchesText && matchesCategory;
    });
    renderCatalog();
    renderTryonList();
  }

  function renderCatalog() {
    els.catalogGrid.innerHTML = "";
    els.catalogEmpty.classList.toggle("hidden", state.filtered.length > 0);

    state.filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "glasses-card";
      card.innerHTML = `
        <div class="glasses-image-box"><img src="${getImageUrl(item)}" alt="${escapeHtml(item.name)}" /></div>
        <div class="glasses-meta">
          <div><h3>${escapeHtml(item.name)}</h3><span class="badge">${escapeHtml(item.category)}</span></div>
        </div>
        <div class="card-actions">
          <button class="btn primary small" data-action="try" data-id="${item.id}">Probar</button>
          <button class="btn secondary small" data-action="fav" data-id="${item.id}">Favorito</button>
        </div>
      `;
      card.querySelector('[data-action="try"]').addEventListener("click", () => {
        selectGlasses(item);
        window.location.hash = "#probador";
      });
      card.querySelector('[data-action="fav"]').addEventListener("click", (event) => {
        event.currentTarget.textContent = "✓ Favorito";
      });
      els.catalogGrid.appendChild(card);
    });
  }

  function renderTryonList() {
    els.tryonList.innerHTML = "";
    state.filtered.forEach((item) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = `tryon-item ${state.selected?.id === item.id ? "active" : ""}`;
      node.innerHTML = `
        <img src="${getImageUrl(item)}" alt="${escapeHtml(item.name)}" />
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small></span>
      `;
      node.addEventListener("click", () => selectGlasses(item));
      els.tryonList.appendChild(node);
    });
  }

  function selectGlasses(item) {
    state.selected = item;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = getImageUrl(item);
    state.selectedImage = image;

    state.adjustment.offsetX = Number(item.offset_x || 0);
    state.adjustment.offsetY = Number(item.offset_y || 0);
    state.adjustment.scale = Number(item.scale || 1);
    state.adjustment.rotation = Number(item.rotation || 0);
    state.adjustment.opacity = 1;
    syncAdjustmentInputs();

    els.selectedGlassesCard.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <img src="${getImageUrl(item)}" alt="${escapeHtml(item.name)}" />
      <span class="badge">${escapeHtml(item.category)}</span>
    `;
    renderTryonList();
  }

  function updateAdjustmentFromInputs() {
    state.adjustment.offsetX = Number(els.offsetX.value);
    state.adjustment.offsetY = Number(els.offsetY.value);
    state.adjustment.scale = Number(els.scaleRange.value);
    state.adjustment.rotation = Number(els.rotationRange.value);
    state.adjustment.opacity = Number(els.opacityRange.value);
    if (!state.cameraStarted) drawIdleCanvas();
  }

  function syncAdjustmentInputs() {
    els.offsetX.value = state.adjustment.offsetX;
    els.offsetY.value = state.adjustment.offsetY;
    els.scaleRange.value = state.adjustment.scale;
    els.rotationRange.value = state.adjustment.rotation;
    els.opacityRange.value = state.adjustment.opacity;
  }

  function resetAdjustments() {
    state.adjustment = { offsetX: 0, offsetY: 0, scale: 1, rotation: 0, opacity: 1 };
    syncAdjustmentInputs();
    if (!state.cameraStarted) drawIdleCanvas();
  }

  async function startCamera() {
    if (!state.selected) {
      setStatus(els.cameraMessage, "Selecciona primero un diseño de lente.", "error");
      return;
    }
    if (state.cameraStarted) return;

    try {
      if (!window.FaceMesh || !window.Camera) {
        throw new Error("No se cargaron las librerías de MediaPipe. Revisa conexión a internet o CDN.");
      }
      setStatus(els.cameraMessage, "Solicitando permiso de cámara y cargando detección facial...");
      els.cameraPlaceholder.classList.add("hidden");

      state.faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      state.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      state.faceMesh.onResults(onFaceResults);

      state.camera = new window.Camera(els.video, {
        onFrame: async () => {
          if (!state.processingFrame) {
            state.processingFrame = true;
            await state.faceMesh.send({ image: els.video });
            state.processingFrame = false;
          }
        },
        width: 1280,
        height: 720,
      });

      await state.camera.start();
      state.cameraStarted = true;
      document.body.classList.add("camera-on");
      setStatus(els.cameraMessage, "Cámara activa. Mueve tu rostro lentamente para ajustar los lentes.", "success");
    } catch (error) {
      console.error(error);
      els.cameraPlaceholder.classList.remove("hidden");
      setStatus(els.cameraMessage, `No se pudo iniciar la cámara: ${error.message}`, "error");
    }
  }

  function stopCamera() {
    try {
      if (state.camera) state.camera.stop();
      const stream = els.video.srcObject;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn(error);
    }
    state.cameraStarted = false;
    state.camera = null;
    state.faceMesh = null;
    els.cameraPlaceholder.classList.remove("hidden");
    document.body.classList.remove("camera-on");
    drawIdleCanvas();
    setStatus(els.cameraMessage, "Cámara detenida.");
  }

  function onFaceResults(results) {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) {
      drawNoFaceHint(ctx, canvas);
      return;
    }
    drawGlasses(ctx, canvas, landmarks);
  }

  function drawGlasses(ctx, canvas, landmarks) {
    if (!state.selectedImage || !state.selectedImage.complete) return;

    // Índices FaceMesh: 33 y 263 son puntos cercanos a los extremos de los ojos.
    // El canvas está espejado, por eso invertimos X para que el overlay coincida con el video espejado.
    const pLeft = toCanvasPoint(landmarks[33], canvas, true);
    const pRight = toCanvasPoint(landmarks[263], canvas, true);
    const pNose = toCanvasPoint(landmarks[168] || landmarks[6], canvas, true);

    const dx = pRight.x - pLeft.x;
    const dy = pRight.y - pLeft.y;
    const eyeDistance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + degToRad(state.adjustment.rotation);
    const centerX = (pLeft.x + pRight.x) / 2 + state.adjustment.offsetX;
    const centerY = ((pLeft.y + pRight.y) / 2 + pNose.y) / 2 - eyeDistance * 0.11 + state.adjustment.offsetY;
    const width = eyeDistance * 2.15 * state.adjustment.scale;
    const imgRatio = state.selectedImage.naturalHeight / Math.max(1, state.selectedImage.naturalWidth);
    const height = width * imgRatio;

    ctx.save();
    ctx.globalAlpha = state.adjustment.opacity;
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(state.selectedImage, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawNoFaceHint(ctx, canvas) {
    ctx.save();
    ctx.fillStyle = "rgba(15, 39, 66, .72)";
    ctx.fillRect(canvas.width / 2 - 210, canvas.height - 86, 420, 48);
    ctx.fillStyle = "white";
    ctx.font = "700 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Acerca tu rostro completo a la cámara", canvas.width / 2, canvas.height - 56);
    ctx.restore();
  }

  function drawIdleCanvas() {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0e1825";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "800 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Probador AR listo", canvas.width / 2, canvas.height / 2 - 16);
    ctx.font = "500 20px system-ui";
    ctx.fillStyle = "rgba(255,255,255,.64)";
    ctx.fillText("Activa la cámara para ver los lentes sobre tu rostro", canvas.width / 2, canvas.height / 2 + 24);
  }

  function capturePhoto() {
    if (!state.cameraStarted) {
      setStatus(els.cameraMessage, "Activa la cámara antes de capturar.", "error");
      return;
    }
    const link = document.createElement("a");
    link.download = `optica-ar-vision-${Date.now()}.png`;
    link.href = els.canvas.toDataURL("image/png");
    link.click();
    setStatus(els.cameraMessage, "Foto capturada y descargada en tu equipo.", "success");
  }

  function unlockAdmin() {
    const code = els.adminPasscode.value.trim();
    if (code === String(config.ADMIN_PASSCODE || "admin123")) {
      state.adminUnlocked = true;
      els.adminLogin.classList.add("hidden");
      els.adminPanel.classList.remove("hidden");
      renderAdminList();
    } else {
      alert("Código incorrecto. Revisa js/config.js o usa admin123 en modo demo.");
    }
  }

  function previewUpload() {
    const file = els.glassesFile.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;
    const url = URL.createObjectURL(file);
    els.uploadPreview.src = url;
    els.uploadPreview.style.display = "block";
    els.previewPlaceholder.style.display = "none";
  }

  async function handleUpload(event) {
    event.preventDefault();
    const file = els.glassesFile.files?.[0];
    if (!file || !validateFile(file)) return;

    const name = els.glassesName.value.trim();
    const category = els.glassesCategory.value;
    const isActive = els.isActive.checked;

    try {
      setStatus(els.uploadStatus, "Procesando imagen y guardando diseño...");
      const processedBlob = await processImageToTransparentPng(file);
      const id = crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}`;

      let record;
      if (hasSupabaseCredentials && config.USE_SUPABASE !== false) {
        const originalPath = `${id}/original-${safeFileName(file.name)}`;
        const processedPath = `${id}/processed.png`;
        const bucket = config.SUPABASE_BUCKET || "glasses-designs";

        const originalUpload = await supabaseClient.storage.from(bucket).upload(originalPath, file, { upsert: true });
        if (originalUpload.error) throw originalUpload.error;
        const processedUpload = await supabaseClient.storage.from(bucket).upload(processedPath, processedBlob, { contentType: "image/png", upsert: true });
        if (processedUpload.error) throw processedUpload.error;

        const originalUrl = supabaseClient.storage.from(bucket).getPublicUrl(originalPath).data.publicUrl;
        const processedUrl = supabaseClient.storage.from(bucket).getPublicUrl(processedPath).data.publicUrl;

        const { data, error } = await supabaseClient
          .from("glasses")
          .insert({
            name,
            category,
            original_image_url: originalUrl,
            processed_image_url: processedUrl,
            is_active: isActive,
            offset_x: 0,
            offset_y: 0,
            scale: 1,
            rotation: 0,
          })
          .select()
          .single();
        if (error) throw error;
        record = data;
      } else {
        const originalDataUrl = await fileToDataUrl(file);
        const processedDataUrl = await blobToDataUrl(processedBlob);
        record = {
          id,
          name,
          category,
          original_image_url: originalDataUrl,
          processed_image_url: processedDataUrl,
          is_active: isActive,
          offset_x: 0,
          offset_y: 0,
          scale: 1,
          rotation: 0,
          created_at: new Date().toISOString(),
        };
        const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        local.unshift(record);
        localStorage.setItem(LS_KEY, JSON.stringify(local));
      }

      setStatus(els.uploadStatus, "Diseño guardado correctamente.", "success");
      els.uploadForm.reset();
      els.uploadPreview.removeAttribute("src");
      els.uploadPreview.style.display = "none";
      els.previewPlaceholder.style.display = "block";
      await loadGlasses();
      selectGlasses(record);
    } catch (error) {
      console.error(error);
      setStatus(els.uploadStatus, `Error al guardar: ${error.message}`, "error");
    }
  }

  function renderAdminList() {
    if (!state.adminUnlocked || !els.adminList) return;
    els.adminList.innerHTML = "";
    if (!state.glasses.length) {
      els.adminList.innerHTML = `<div class="empty-state">Todavía no hay diseños guardados.</div>`;
      return;
    }
    state.glasses.forEach((item) => {
      const node = document.createElement("div");
      node.className = "admin-item";
      node.innerHTML = `
        <img src="${getImageUrl(item)}" alt="${escapeHtml(item.name)}" />
        <div>
          <h4>${escapeHtml(item.name)}</h4> <span class="badge">${escapeHtml(item.category)}</span>
          <p>Estado: <strong>${item.is_active !== false ? "Activo" : "Inactivo"}</strong></p>
          <div class="admin-actions">
            <button class="btn secondary small" data-action="toggle">${item.is_active !== false ? "Desactivar" : "Activar"}</button>
            <button class="btn secondary small" data-action="select">Probar</button>
            <button class="btn danger small" data-action="delete">Eliminar</button>
          </div>
        </div>
      `;
      node.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleActive(item));
      node.querySelector('[data-action="select"]').addEventListener("click", () => {
        selectGlasses(item);
        window.location.hash = "#probador";
      });
      node.querySelector('[data-action="delete"]').addEventListener("click", () => deleteGlasses(item));
      els.adminList.appendChild(node);
    });
  }

  async function toggleActive(item) {
    try {
      const next = item.is_active === false;
      if (hasSupabaseCredentials && config.USE_SUPABASE !== false && !String(item.id).startsWith("demo-")) {
        const { error } = await supabaseClient.from("glasses").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", item.id);
        if (error) throw error;
      } else {
        const local = state.glasses.map((g) => g.id === item.id ? { ...g, is_active: next } : g);
        localStorage.setItem(LS_KEY, JSON.stringify(local.filter((g) => !String(g.id).startsWith("demo-"))));
      }
      await loadGlasses();
    } catch (error) {
      alert(`No se pudo actualizar: ${error.message}`);
    }
  }

  async function deleteGlasses(item) {
    if (!confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      if (hasSupabaseCredentials && config.USE_SUPABASE !== false && !String(item.id).startsWith("demo-")) {
        const { error } = await supabaseClient.from("glasses").delete().eq("id", item.id);
        if (error) throw error;
      } else {
        const local = state.glasses.filter((g) => g.id !== item.id && !String(g.id).startsWith("demo-"));
        localStorage.setItem(LS_KEY, JSON.stringify(local));
      }
      if (state.selected?.id === item.id) state.selected = null;
      await loadGlasses();
    } catch (error) {
      alert(`No se pudo eliminar: ${error.message}`);
    }
  }

  function validateFile(file) {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      alert("Solo se permiten imágenes JPG, JPEG o PNG.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar 5 MB.");
      return false;
    }
    return true;
  }

  async function processImageToTransparentPng(file) {
    const image = await loadImageFromFile(file);
    const maxWidth = 1200;
    const scale = Math.min(1, maxWidth / image.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Quita fondos blancos o casi blancos. Para resultados profesionales, usar PNG transparente.
      if (r > 235 && g > 235 && b > 235) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png", 0.92));
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function toCanvasPoint(point, canvas, mirrored = false) {
    return {
      x: mirrored ? (1 - point.x) * canvas.width : point.x * canvas.width,
      y: point.y * canvas.height,
    };
  }

  function getImageUrl(item) {
    return item.processed_image_url || item.original_image_url || createDemoGlassesSvg("#0f2742", "#25b8ff");
  }

  function setStatus(element, message, type = "") {
    if (!element) return;
    element.className = `status-message ${type}`.trim();
    element.textContent = message;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeFileName(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
  }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function createDemoGlassesSvg(frameColor, lensColor, dark = false) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 220">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#0f2742" flood-opacity="0.25"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d="M60 112 C110 42 222 42 272 112" fill="none" stroke="${frameColor}" stroke-width="28" stroke-linecap="round"/>
          <path d="M428 112 C478 42 590 42 640 112" fill="none" stroke="${frameColor}" stroke-width="28" stroke-linecap="round"/>
          <path d="M272 112 C306 86 394 86 428 112" fill="none" stroke="${frameColor}" stroke-width="22" stroke-linecap="round"/>
          <path d="M60 112 C70 200 250 200 272 112 C250 30 70 30 60 112Z" fill="${dark ? '#1f2937' : lensColor}" opacity="${dark ? '.62' : '.22'}" stroke="${frameColor}" stroke-width="24"/>
          <path d="M428 112 C450 200 630 200 640 112 C630 30 450 30 428 112Z" fill="${dark ? '#1f2937' : lensColor}" opacity="${dark ? '.62' : '.22'}" stroke="${frameColor}" stroke-width="24"/>
          <path d="M14 100 C34 82 54 82 71 105" fill="none" stroke="${frameColor}" stroke-width="18" stroke-linecap="round"/>
          <path d="M686 100 C666 82 646 82 629 105" fill="none" stroke="${frameColor}" stroke-width="18" stroke-linecap="round"/>
        </g>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
})();
