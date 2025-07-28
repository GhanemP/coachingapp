import { handlers } from "@/lib/auth"

// Ensure Node.js runtime for bcryptjs compatibility
export const runtime = 'nodejs'

export const { GET, POST } = handlers