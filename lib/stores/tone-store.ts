import { create } from "zustand"

type ToneStore = {
  selectedTone: string
  setSelectedTone: (tone: string) => void
}

export const useToneStore = create<ToneStore>((set) => ({
  selectedTone: "balanced",
  setSelectedTone: (tone: string) => set({ selectedTone: tone }),
}))

