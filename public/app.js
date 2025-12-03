// =========================
// IMPORTS FIREBASE v10+
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, query, where, getDocs, orderBy,
  doc, deleteDoc, updateDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJBsxnJQyFb5KNK35BhHNqnbHRJlksptw",
  authDomain: "pilltick-b8213.firebaseapp.com",
  projectId: "pilltick-b8213",
  storageBucket: "pilltick-b8213.firebasestorage.app",
  messagingSenderId: "221398812448",
  appId: "1:221398812448:web:59981bacd8d42a1fc53945"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =========================
// ELEMENTOS DOM
// =========================
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameSpan = document.getElementById("user-name");
const appDiv = document.getElementById("app");
const medList = document.getElementById("med-list");
const notificationDiv = document.getElementById("notification-permission");
const enableNotifBtn = document.getElementById("enable-notifications");

// Formulario agregar
const formTitle = document.getElementById("form-title");
const medName = document.getElementById("med-name");
const medDose = document.getElementById("med-dose");
const medFirstTime = document.getElementById("med-first-time");
const medStart = document.getElementById("med-start");
const medEnd = document.getElementById("med-end");
const medTimes = document.getElementById("med-times");
const medImg = document.getElementById("med-img");
const medPdf = document.getElementById("med-pdf");
const addMedBtn = document.getElementById("add-med-btn");
const updateMedBtn = document.getElementById("update-med-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

// Modal edición
const editModal = document.getElementById("edit-modal");
const editName = document.getElementById("edit-name");
const editDose = document.getElementById("edit-dose");
const editFirstTime = document.getElementById("edit-first-time");
const editStart = document.getElementById("edit-start");
const editEnd = document.getElementById("edit-end");
const editTimes = document.getElementById("edit-times");
const editImg = document.getElementById("edit-img");
const editPdf = document.getElementById("edit-pdf");
const saveEditBtn = document.getElementById("save-edit-btn");
const cancelModalBtn = document.getElementById("cancel-modal-btn");

let editingId = null;

// =========================
// AUTH
// =========================
loginBtn.onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch(e => alert(e.message));
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userNameSpan.textContent = user.displayName?.split(" ")[0] || user.email;
    appDiv.style.display = "block";
    loadMedicamentos();
    checkNotificationPermission();
    scheduleAllReminders();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userNameSpan.textContent = "";
    appDiv.style.display = "none";
    medList.innerHTML = "";
  }
});

// =========================
// NOTIFICACIONES WEB
// =========================
function checkNotificationPermission() {
  if (Notification.permission === "default") {
    notificationDiv.style.display = "block";
  } else if (Notification.permission === "granted") {
    notificationDiv.style.display = "none";
  }
}

enableNotifBtn.onclick = () => {
  Notification.requestPermission().then(perm => {
    if (perm === "granted") notificationDiv.style.display = "none";
  });
};

// =========================
// UTILIDADES
// =========================
function uploadFileIfExists(file, path) {
  if (!file) return null;
  const storageRef = ref(storage, path);
  return uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
}

function resetForm() {
  medName.value = medDose.value = medStart.value = medEnd.value = "";
  medFirstTime.value = "08:00";
  medTimes.value = "3";
  medImg.value = medPdf.value = "";
  addMedBtn.style.display = "block";
  updateMedBtn.style.display = cancelEditBtn.style.display = "none";
  formTitle.textContent = "Agregar medicamento";
  editingId = null;
}

// =========================
// GENERAR HORARIOS AUTOMÁTICOS
// =========================
function generateSchedule(firstTime, timesPerDay) {
  const [h, m] = firstTime.split(":").map(Number);
  const interval = Math.floor(24 * 60 / timesPerDay);
  const horarios = [];

  for (let i = 0; i < timesPerDay; i++) {
    let minutes = h * 60 + m + i * interval;
    let hh = Math.floor(minutes / 60) % 24;
    let mm = minutes % 60;
    horarios.push(`${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}`);
  }
  return horarios;
}

// =========================
// PROGRAMAR RECORDATORIO
// =========================
function scheduleReminder(med) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  med.horarios.forEach(hora => {
    const [h, m] = hora.split(":").map(Number);
    const reminderTime = new Date(today);
    reminderTime.setHours(h, m, 0, 0);

    // Si ya pasó hoy, no programar
    if (reminderTime < today) return;

    const delay = reminderTime - today;

    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("¡Hora de tu medicamento!", {
          body: `${med.nombre} - ${med.dosis}`,
          tag: `med-${med.id}-${hora}`
        });
      }
      // Sonido
      const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-alarm-tone-1085.mp3");
      audio.play().catch(()=>{});
    }, delay);
  });
}

async function scheduleAllReminders() {
  if (!auth.currentUser) return;
  const q = query(collection(db, "medicamentos"), where("userId", "==", auth.currentUser.uid));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const med = {id: doc.id, ...doc.data()};
    if (med.horarios) scheduleReminder(med);
  });
}

// =========================
// AGREGAR / EDITAR
// =========================
// === GUARDAR MEDICAMENTO CON VALIDACIÓN ESTRICTA ===
addMedBtn.onclick = async () => {
  const errorDiv = document.getElementById("form-error");
  errorDiv.style.display = "none";
  errorDiv.textContent = "";

  // Validaciones obligatorias
  if (!medName.value.trim()) {
    mostrarError("El nombre del medicamento es obligatorio");
    return;
  }
  if (!medDose.value.trim()) {
    mostrarError("La dosis es obligatoria");
    return;
  }
  if (!medStart.value) {
    mostrarError("La fecha de inicio es obligatoria");
    return;
  }
  if (!medFirstTime.value) {
    mostrarError("La hora de la primera toma es obligatoria");
    return;
  }
  if (!medTimes.value || medTimes.value < 1) {
    mostrarError("Debe tomar al menos 1 vez al día");
    return;
  }

  const userId = auth.currentUser.uid;
  const horarios = generateSchedule(medFirstTime.value, Number(medTimes.value));

  let imageUrl = null, pdfUrl = null;
  try {
    if (medImg.files[0]) {
      imageUrl = await uploadFileIfExists(medImg.files[0], `images/${userId}/${Date.now()}_${medImg.files[0].name}`);
    }
    if (medPdf.files[0]) {
      pdfUrl = await uploadFileIfExists(medPdf.files[0], `pdfs/${userId}/${Date.now()}_${medPdf.files[0].name}`);
    }

    await addDoc(collection(db, "medicamentos"), {
      userId,
      nombre: medName.value.trim(),
      dosis: medDose.value.trim(),
      firstTime: medFirstTime.value,
      horarios,
      startDate: medStart.value,
      endDate: medEnd.value || null,
      timesPerDay: Number(medTimes.value),
      imageUrl,
      pdfUrl,
      createdAt: serverTimestamp()
    });

    alert("¡Medicamento agregado correctamente!");
    resetForm();
    loadMedicamentos();
    scheduleAllReminders();

  } catch (err) {
    console.error(err);
    mostrarError("Error al guardar. Revisa tu conexión.");
  }
};

// Función auxiliar para mostrar errores
function mostrarError(mensaje) {
  const errorDiv = document.getElementById("form-error");
  errorDiv.textContent = mensaje;
  errorDiv.style.display = "block";
  errorDiv.scrollIntoView({ behavior: "smooth", block: "center" });
}

// =========================
// LISTAR MEDICAMENTOS
// =========================
window.openEditModal = function(id) {
  editingId = id;
  getDoc(doc(db, "medicamentos", id)).then(snap => {
    const d = snap.data();
    editName.value = d.nombre;
    editDose.value = d.dosis;
    editFirstTime.value = d.firstTime;
    editStart.value = d.startDate;
    editEnd.value = d.endDate || "";
    editTimes.value = d.timesPerDay;
    editModal.style.display = "flex";
  });
};

window.deleteMed = async function(id, imageUrl, pdfUrl) {
  if (!confirm("¿Eliminar este medicamento para siempre?")) return;
  await deleteDoc(doc(db, "medicamentos", id));
  if (imageUrl) await deleteObject(ref(storage, imageUrl)).catch(()=>{});
  if (pdfUrl) await deleteObject(ref(storage, pdfUrl)).catch(()=>{});
  loadMedicamentos();
};

saveEditBtn.onclick = async () => {
  if (!editName.value.trim() || !editDose.value.trim() || !editFirstTime.value || !editStart.value || !editTimes.value) {
    alert("Todos los campos son obligatorios excepto imagen y PDF");
    return;
  }

  const horarios = generateSchedule(editFirstTime.value, Number(editTimes.value));
  const updates = {
    nombre: editName.value.trim(),
    dosis: editDose.value.trim(),
    firstTime: editFirstTime.value,
    horarios,
    startDate: editStart.value,
    endDate: editEnd.value || null,
    timesPerDay: Number(editTimes.value),
    updatedAt: serverTimestamp()
  };

  if (editImg.files[0]) {
    updates.imageUrl = await uploadFileIfExists(editImg.files[0], `images/${auth.currentUser.uid}/${Date.now()}_${editImg.files[0].name}`);
  }
  if (editPdf.files[0]) {
    updates.pdfUrl = await uploadFileIfExists(editPdf.files[0], `pdfs/${auth.currentUser.uid}/${Date.now()}_${editPdf.files[0].name}`);
  }

  await updateDoc(doc(db, "medicamentos", editingId), updates);
  editModal.style.display = "none";
  loadMedicamentos();
  scheduleAllReminders();
};

cancelModalBtn.onclick = () => editModal.style.display = "none";

async function loadMedicamentos() {
  medList.innerHTML = "<p style='text-align:center; color:#666;'>Cargando tus medicamentos...</p>";
  
  try {
    const q = query(collection(db, "medicamentos"), where("userId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      medList.innerHTML = "<p style='text-align:center; color:#888;'>¡Agrega tu primer medicamento!</p>";
      return;
    }

    // Cargar tomas de hoy
    const hoy = new Date().toISOString().slice(0,10);
    const tomasQuery = query(collection(db, "tomas"), 
      where("userId", "==", auth.currentUser.uid),
      where("fecha", "==", hoy)
    );
    const tomasSnap = await getDocs(tomasQuery);
    const tomasHoy = {};
    tomasSnap.forEach(t => tomasHoy[`${t.data().medId}-${t.data().hora}`] = t.data());

    let totalPendientes = 0;
    let totalTomadas = 0;

    medList.innerHTML = "";

    for (const docu of snap.docs) {
      const d = docu.data();
      const id = docu.id;

      // Generar horarios si no existen (compatibilidad)
      let horarios = d.horarios || generateSchedule(d.firstTime || "08:00", d.timesPerDay || 3);

      const card = document.createElement("div");
      card.className = "med-card";

      let horariosHTML = "";
      let pendientesHoy = 0;

      horarios.forEach(hora => {
        const key = `${id}-${hora}`;
        const toma = tomasHoy[key];
        const ahora = new Date();
        const horaDate = new Date(`${hoy} ${hora}:00`);
        const esRetrasado = horaDate < ahora && !toma;
        const estado = toma ? "tomado" : (esRetrasado ? "retrasado" : "pendiente");

        if (!toma) pendientesHoy++;
        if (toma) totalTomadas++; else totalPendientes++;

        horariosHTML += `
          <div class="horario-item horario-${estado}">
            ${hora}
            <br>
            ${toma 
              ? `Tomado ✓` 
              : `<button class="toma-btn" onclick="marcarToma('${id}', '${hora}', '${d.nombre}')">Tomé</button>
                 <button class="snooze-btn" onclick="posponerToma('${id}', '${hora}')">+10min</button>`
            }
          </div>
        `;
      });

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px;">
          ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;">` : ''}
          <div>
            <strong style="font-size:1.4em; color:#1e6b3a;">${d.nombre}</strong><br>
            <span style="color:#555;">${d.dosis}</span><br>
            <small>${d.timesPerDay} veces al día</small>
          </div>
        </div>
        <div class="toma-grid">${horariosHTML}</div>
        <div style="margin-top:15px; text-align:right;">
          <button onclick="openEditModal('${id}')" style="background:#2980b9;">Editar</button>
          <button onclick="deleteMed('${id}', '${d.imageUrl || ""}', '${d.pdfUrl || ""}')" style="background:#c0392b;">Eliminar</button>
        </div>
      `;
      medList.appendChild(card);
    }

    // Mostrar adherencia del día
    const totalDosisHoy = totalPendientes + totalTomadas;
    const adherencia = totalDosisHoy > 0 ? Math.round((totalTomadas / totalDosisHoy) * 100) : 100;
    const adherenciaDiv = document.createElement("div");
    adherenciaDiv.className = "adherencia";
    adherenciaDiv.innerHTML = `Adherencia hoy: ${adherencia}% ${adherencia === 100 ? "Perfecto" : adherencia >= 80 ? "Bien" : "Mejorable"}`;
    medList.prepend(adherenciaDiv);

    // Reprogramar recordatorios
    scheduleAllReminders();

  } catch (err) {
    console.error(err);
    medList.innerHTML = "<p style='color:red;'>Error cargando datos</p>";
  }
}

// === MARCAR TOMA ===
window.marcarToma = async (medId, hora, nombre) => {
  const hoy = new Date().toISOString().slice(0,10);
  const userId = auth.currentUser.uid;

  await addDoc(collection(db, "tomas"), {
    userId,
    medId,
    hora,
    fecha: hoy,
    nombreMed: nombre,
    tomadoEn: new Date()
  });

  new Notification("¡Bien hecho!", {
    body: `Registramos que tomaste ${nombre} a las ${hora}`
  });

  loadMedicamentos(); // recargar
};

// === POSPONER 10 MIN ===
window.posponerToma = (medId, hora) => {
  const [h, m] = hora.split(":").map(Number);
  const nuevaHora = new Date();
  nuevaHora.setHours(h, m + 10, 0, 0);

  const hh = nuevaHora.getHours().toString().padStart(2,"0");
  const mm = nuevaHora.getMinutes().toString().padStart(2,"0");

  alert(`Recordatorio pospuesto a las ${hh}:${mm}`);

  setTimeout(() => {
    new Notification("¡Hora de tu medicamento!", {
      body: `Tienes pendiente una toma (pospuesta)`,
      tag: `snooze-${medId}-${hora}`
    });
    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-alarm-tone-1085.mp3");
    audio.play();
  }, 10 * 60 * 1000);
};


// =========================
// CHATBOT GEMINI 
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const chatBubble   = document.getElementById("chatbot-bubble");
  const chatWindow   = document.getElementById("chatbot-window");
  const chatClose    = document.getElementById("chat-close");
  const chatMinimize = document.getElementById("chat-minimize");   
  const chatMessages = document.getElementById("chat-messages");
  const chatInput    = document.getElementById("chat-input");
  const chatSend     = document.getElementById("chat-send");

  // Si alguno de estos elementos no existe → no hacemos nada (evita el error null)
  if (!chatBubble || !chatWindow || !chatMessages || !chatInput || !chatSend) {
    console.warn("Chatbot no encontrado en el DOM");
    return;
  }

  // ABRIR Y CERRAR – usamos la clase "open" que tiene el CSS
  chatBubble.onclick = () => chatWindow.classList.toggle("open");
  chatClose.onclick = () => chatWindow.classList.remove("open");
  if (chatMinimize) chatMinimize.onclick = () => chatWindow.classList.remove("open");


  const API_KEY = "AIzaSyBN8rG1f4GDnyflk0NFnYihgE4jJ6Szpak";

  const enviar = async () => {
    const texto = chatInput.value.trim();
    if (!texto) return;

    // Mensaje del usuario
    const userDiv = document.createElement("div");
    userDiv.className = "message user-message";
    userDiv.textContent = texto;
    chatMessages.appendChild(userDiv);
    chatInput.value = "";

    // Mensaje "pensando"
    const botDiv = document.createElement("div");
    botDiv.className = "message bot-message";
    botDiv.textContent = "Pensando...";
    chatMessages.appendChild(botDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text:
                `Eres un asistente médico amable y responsable. Solo hablas de salud, medicamentos, ejercicio, nutrición y sueño. 
                Siempre respondes en español y con lenguaje claro. Si no sabes algo, di que consulte a su médico.
                Pregunta: ${texto}`
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HTTP ${response.status}: ${err}`);
      }

      const data = await response.json();
      botDiv.textContent = data.candidates[0].content.parts[0].text;

    } catch (err) {
      console.error("Error Gemini:", err);
      botDiv.textContent = "Error de conexión. Intenta de nuevo más tarde.";
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  chatSend.onclick = enviar;
  chatInput.addEventListener("keypress", e => e.key === "Enter" && enviar());
});