/**
 * Application Configuration
 *
 * This file contains configurable settings for the Iceberg.AI application.
 * Edit these values to customize the application behavior.
 */

// User-related settings
export const userConfig = {
  // Default role for all users (options: 'free', 'pro', 'admin')
  // Set to 'pro' to give all users premium access by default
  defaultRole: "pro",

  // Override specific user roles by email
  // Example: { 'user@example.com': 'free', 'admin@example.com': 'admin' }
  roleOverrides: {} as Record<string, "free" | "pro" | "admin">,

  // Free tier limits (currently bypassed as all users are 'pro' by default)
  freeTierLimits: {
    searchesPerMonth: 999, // Temporarily set to high value for unrestricted access
    deepDivesPerMonth: 999, // Temporarily set to high value for unrestricted access
    maxResults: 10, // Increased from 5 to 10
  },

  // Pro tier features
  proTierFeatures: {
    unlimitedSearches: true,
    unlimitedDeepDives: true,
    maxResults: 10,
    accessToPremiumModels: true,
  },

  // Temporarily disable search limits for all users
  enforceSearchLimits: false,
}

// Search-related settings
export const searchConfig = {
  // Default model for searches
  defaultModel: "openai/gpt-3.5-turbo",

  // Default tone for searches
  defaultTone: "balanced",

  // Number of suggestions to show
  suggestionsCount: 5,

  // Enable trending topics in suggestions
  enableTrendingTopics: true,

  // Search providers configuration
  providers: {
    // Enable/disable different search providers
    tavily: false,
    exa: true,
    google: true,

    // Provider weights (higher = more priority)
    weights: {
      tavily: 3, // Increased from 3 to 5
      exa: 5,
      google: 1,
    },

    // Number of results to fetch from each provider
    resultsPerProvider: 10,

    // Combine results from multiple providers
    combineResults: true,
  },
}

// Iceberg themes for suggested searches
export const icebergThemes = [
  // Conspiracy and Mystery
  "The Conspiracy Theory Iceberg: From Mainstream to Unthinkable",
  "Vanished Without a Trace: History's Most Baffling Disappearances",
  "Forbidden Archaeology: Evidence That Rewrites Human History",
  "The Dark Web: What Lurks in the Internet's Deepest Corners",
  "Unexplained Phenomena That Science Can't Explain",

  // History and Lost Knowledge
  "Lost Ancient Technologies That Still Baffle Modern Engineers",
  "Forgotten Civilizations More Advanced Than We Thought",
  "History's Greatest Cover-ups and Suppressed Truths",
  "Extinct Human Species and Their Mysterious Legacies",
  "Ancient Texts That Predicted Modern Discoveries",

  // Science and Reality
  "Quantum Physics Anomalies That Challenge Reality",
  "Consciousness Research: The Frontier Science Fears",
  "Simulation Theory: Evidence We Live in a Programmed Reality",
  "Declassified Government Research Too Strange to Believe",
  "Transhumanism: The Future Evolution of Humanity",

  // Paranormal and Unexplained
  "Cryptid Encounters Documented by Credible Witnesses",
  "Near-Death Experiences: Patterns That Suggest Afterlife",
  "Psychic Phenomena Validated Under Scientific Conditions",
  "Haunted Locations With Documented Paranormal Evidence",
  "UFO Incidents Confirmed by Multiple Governments",

  // Mind and Psychology
  "Psychological Operations That Shaped Public Opinion",
  "Forbidden Psychology: Studies Too Controversial to Continue",
  "Mind Control Technologies: From MKUltra to Modern Methods",
  "Cognitive Biases That Hide the True Nature of Reality",
  "Dream Research: The Science of Accessing Other Dimensions",
]

// Function to get user role with override support
export function getUserRole(email: string): "free" | "pro" | "admin" {
  if (!email) return userConfig.defaultRole as "free" | "pro" | "admin"

  // Check for role override
  if (userConfig.roleOverrides[email]) {
    return userConfig.roleOverrides[email]
  }

  // Return default role
  return userConfig.defaultRole as "free" | "pro" | "admin"
}

// Function to check if user can perform searches
// Currently always returns true due to temporary unrestricted access
export function canUserSearch(): boolean {
  // Bypass search limits check
  if (!userConfig.enforceSearchLimits) return true

  // Normal logic would go here when limits are enforced again
  return true
}

// Function to check if user can perform deep dives
// Currently always returns true due to temporary unrestricted access
export function canUserDeepDive(): boolean {
  // Bypass deep dive limits check
  if (!userConfig.enforceSearchLimits) return true

  // Normal logic would go here when limits are enforced again
  return true
}

