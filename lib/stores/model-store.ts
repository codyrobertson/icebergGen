import { create } from "zustand"

type ModelStore = {
  selectedModel: string
  setSelectedModel: (model: string) => void
}

export const useModelStore = create<ModelStore>((set) => ({
  selectedModel: "gpt-4o",
  setSelectedModel: (model: string) => set({ selectedModel: model }),
}))

