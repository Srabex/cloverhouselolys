// Casas rescatadas de Lovable Cloud (14 nov 2026). Se cargan solas a D1 la primera vez
// y sirven de respaldo si la base no responde. Para cambiarlas: panel /admin.
const fotos = (zona, n, portada) => {
  const lista = Array.from({ length: n }, (_, i) => `/fotos/${zona}-${String(i + 1).padStart(2, "0")}.webp`);
  const p = `/fotos/${zona}-${String(portada).padStart(2, "0")}.webp`;
  return [p, ...lista.filter((f) => f !== p)];
};

export const SEMILLA = [
  {
    id: "9a4ab380-6cbe-46cc-92e5-dfeeaa95d75c",
    titulo: "Casa de una planta en Sicomoro",
    zona: "Sicomoro",
    precio: 5200000,
    precio_nota: "",
    recamaras: 3, banos: 3.5, construccion: 270.02, terreno: 309.52,
    descripcion: "Casa de una planta con 3 recámaras, cada una con su baño. Recién impermeabilizada, con 4 paneles solares e inversor, reja eléctrica y alarma.",
    caracteristicas: ["Una planta", "3 recámaras con baño", "4 paneles solares con inversor", "Reja eléctrica y alarma", "3 minisplit y calefacción", "Cocina de granito con estufa y microondas", "Hidroneumático y boiler", "Centro de lavado", "Baño con tina", "Recién impermeabilizada"],
    fotos: fotos("sicomoro", 10, 3),
    orden: 1,
  },
  {
    id: "2c60b9c2-6e23-48bc-886e-28e483d76b69",
    titulo: "Casa de una planta con departamento para rentar",
    zona: "Lomas del Santuario",
    precio: 6200000,
    precio_nota: "",
    recamaras: 3, banos: 2, construccion: 372, terreno: 450,
    descripcion: "Casa de una planta muy amplia, con un departamento independiente en la planta alta que puedes rentar. Excelente ubicación.",
    caracteristicas: ["Una planta", "Departamento independiente para rentar", "3 recámaras", "2 baños completos", "Sala, comedor y estancia", "Cocineta equipada", "Cuarto de lavado o de servicio"],
    fotos: fotos("santuario", 7, 1),
    orden: 2,
  },
  {
    id: "13e459ba-dd60-40b9-9df7-563e59ac7ae4",
    titulo: "Casa con amplio patio cerca de avenidas principales",
    zona: "Campanario",
    precio: 4500000,
    precio_nota: "",
    recamaras: 3, banos: 2.5, construccion: 206.5, terreno: 254.7,
    descripcion: "Casa con amplio patio y excelente ubicación, cerca de avenidas principales.",
    caracteristicas: ["Amplio patio", "3 recámaras", "Cocineta equipada", "Sala y estancia", "Aire acondicionado", "Calefacción"],
    fotos: fotos("campanario", 11, 11).filter((f) => !f.endsWith("campanario-01.webp")),
    orden: 3,
  },
  {
    id: "7b6c8f58-db21-43c9-9804-393d7e778bda",
    titulo: "Casa en Residencial Campestre II",
    zona: "Residencial Campestre II",
    precio: 3950000,
    precio_nota: "",
    recamaras: 3, banos: 2.5, construccion: 190, terreno: 228,
    descripcion: "Bonita casa con excelente ubicación, dos patios y cochera para dos autos.",
    caracteristicas: ["3 recámaras", "2 baños y medio", "Dos patios", "Cochera para 2 autos", "Cocineta con estufa y campana", "2 aires acondicionados", "Calefacción", "Sala, comedor y lavandería"],
    fotos: fotos("campestre", 15, 1),
    orden: 4,
  },
  {
    id: "cebff4bf-fb23-441f-b798-375c6e70c780",
    titulo: "Casa de 4 recámaras en privada",
    zona: "Santa Rosa",
    precio: 2800000,
    precio_nota: "Negociable",
    recamaras: 4, banos: 2.5, construccion: 160, terreno: 160,
    descripcion: "Casa en privada con 4 recámaras con clóset y vestidor en la principal. Aire y calefacción central, jardín y cochera techada para 2 autos más dos espacios al frente.",
    caracteristicas: ["En privada", "4 recámaras con clóset", "Vestidor en recámara principal", "Aire y calefacción central", "Aljibe e hidroneumático (4 mil litros)", "Cochera techada para 2 autos + 2 espacios", "Jardín", "Cocineta con barra", "Tanque estacionario y boiler", "Cuarto de lavado"],
    fotos: fotos("santa-rosa", 15, 2),
    orden: 5,
  },
  {
    id: "238cc420-7d64-4211-aa20-cfc667f80c32",
    titulo: "Casa cerca de UACH Campus 2",
    zona: "Paseos de Chihuahua",
    precio: 2300000,
    precio_nota: "",
    recamaras: 3, banos: 2, construccion: 103.18, terreno: 120,
    descripcion: "Casa con excelente ubicación al norte, cerca de UACH Campus 2. Dos recámaras en planta alta y una en planta baja.",
    caracteristicas: ["3 recámaras (una en planta baja)", "2 baños completos", "Cocineta", "Aire acondicionado"],
    fotos: fotos("paseos", 6, 1),
    orden: 6,
  },
].map((p) => ({ estado: "disponible", visible: 1, ...p }));
