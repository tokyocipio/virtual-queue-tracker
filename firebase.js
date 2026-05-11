// ─────────────────────────────────────────────────────
// firebase.js — Koneksi ke Firestore Database
// GANTI firebaseConfig di bawah dengan config kamu
// dari Firebase Console → Project Settings → Your Apps
// ─────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── GANTI INI DENGAN CONFIG DARI FIREBASE CONSOLE ──
const firebaseConfig = {
 apiKey: "AIzaSyCf0RD-zTsNDRFJtIwKkEd88cDZKjQiCeg",
  authDomain: "virtual-queue-tracker.firebaseapp.com",
  databaseURL: "https://virtual-queue-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "virtual-queue-tracker",
  storageBucket: "virtual-queue-tracker.firebasestorage.app",
  messagingSenderId: "325952741509",
  appId: "1:325952741509:web:cec26616197d2795ad89ec",
  measurementId: "G-WXSJ3G3NEG"
};
// ───────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── NAMA KOLEKSI DI FIRESTORE ──
const COL_ANTRIAN = "antrian_dokter";
const COL_RESEP   = "antrian_apotek";
const COL_CONFIG  = "config";

// ─────────────────────────────────────────────────────
// HELPER: ambil nomor antrian berikutnya (auto-increment)
// ─────────────────────────────────────────────────────
export async function getNomorBerikutnya(prefix = "A") {
  const ref = doc(db, COL_CONFIG, "counter_" + prefix);
  const snap = await getDoc(ref);
  let current = snap.exists() ? snap.data().last : 0;
  current++;
  await setDoc(ref, { last: current });
  return prefix + "-" + String(current).padStart(3, "0");
}

// ─────────────────────────────────────────────────────
// ANTRIAN DOKTER
// ─────────────────────────────────────────────────────

// Tambah pasien baru ke antrian dokter
export async function tambahAntrian(data) {
  const no = await getNomorBerikutnya("A");
  const docRef = await addDoc(collection(db, COL_ANTRIAN), {
    no,
    nama:      data.nama,
    gender:    data.gender,
    poli:      data.poli,
    dok:       data.dok,
    ruang:     data.ruang,
    keluhan:   data.keluhan,
    bayar:     data.bayar,
    status:    "menunggu",   // menunggu | dilayani | selesai | tidak_hadir
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, no };
}

// Update status antrian (selesai, tidak_hadir, dll)
export async function updateAntrian(id, data) {
  await updateDoc(doc(db, COL_ANTRIAN, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Hapus antrian (opsional)
export async function hapusAntrian(id) {
  await deleteDoc(doc(db, COL_ANTRIAN, id));
}

// Listen realtime — antrian aktif (menunggu & dilayani)
// Callback dipanggil setiap ada perubahan di Firestore
export function listenAntrian(callback) {
  const q = query(
    collection(db, COL_ANTRIAN),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ─────────────────────────────────────────────────────
// ANTRIAN APOTEK (RESEP)
// ─────────────────────────────────────────────────────

export async function tambahResep(data) {
  const no = await getNomorBerikutnya("B");
  await addDoc(collection(db, COL_RESEP), {
    no,
    nama:      data.nama,
    jenis:     data.jenis || "Obat jadi",
    prog:      0,
    status:    "terima",    // terima | verif | siapkan | cek | selesai
    eta:       20,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return no;
}

export async function updateResep(id, data) {
  await updateDoc(doc(db, COL_RESEP, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function hapusResep(id) {
  await deleteDoc(doc(db, COL_RESEP, id));
}

export function listenResep(callback) {
  const q = query(
    collection(db, COL_RESEP),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ─────────────────────────────────────────────────────
// CONFIG / STATE GLOBAL (nomor yang sedang dilayani, dll)
// ─────────────────────────────────────────────────────
export async function setConfig(key, value) {
  await setDoc(doc(db, COL_CONFIG, key), { value, updatedAt: serverTimestamp() });
}

export function listenConfig(key, callback) {
  return onSnapshot(doc(db, COL_CONFIG, key), (snap) => {
    if (snap.exists()) callback(snap.data().value);
  });
}