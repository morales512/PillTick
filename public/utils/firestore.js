// utils/firestore.js
import { db } from "../firebaseConfig.js";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

const MEDICAMENTOS_COL = "medicamentos";

// Agregar medicamento
export const addMedicamento = async (userId, nombre, dosis) => {
  return await addDoc(collection(db, MEDICAMENTOS_COL), {
    userId,
    nombre,
    dosis,
    createdAt: new Date()
  });
};

// Listar medicamentos de un usuario
export const getMedicamentos = async (userId) => {
  const q = query(collection(db, MEDICAMENTOS_COL), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
