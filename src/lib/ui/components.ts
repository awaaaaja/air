import type { ComponentId } from "@/lib/simulation/engine";
export const componentInfo: Record<
  ComponentId,
  { name: string; description: string }
> = {
  "TANK-01": { name: "Tangki utama", description: "Sumber pasokan air" },
  "PUMP-01": { name: "Pompa air", description: "Mendorong air ke jaringan" },
  "PIPE-01": {
    name: "Pipa masuk",
    description: "Menghubungkan pompa ke jaringan",
  },
  "PIPE-02": {
    name: "Pipa utama",
    description: "Pipa untuk pengujian kebocoran",
  },
  "PIPE-03": {
    name: "Pipa keluaran",
    description: "Mengalirkan air menuju konsumen",
  },
  "VALVE-01": {
    name: "Katup pengatur",
    description: "Mengatur aliran menuju konsumen",
  },
  "PRESSURE-01": {
    name: "Sensor tekanan",
    description: "Mengukur tekanan air",
  },
  "FLOW-01": {
    name: "Sensor debit",
    description: "Mengukur banyaknya air yang mengalir",
  },
  "NODE-01": { name: "Konsumen", description: "Titik pemakaian air" },
};
