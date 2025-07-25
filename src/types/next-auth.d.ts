import { UserRole } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      managedBy?: string | null;
      teamLeaderId?: string | null;
    }
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    managedBy?: string | null;
    teamLeaderId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    managedBy?: string | null;
    teamLeaderId?: string | null;
  }
}