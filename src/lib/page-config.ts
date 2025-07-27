// Page configuration for client components that use authentication
// This ensures they are not statically generated during build

export const authPageConfig = {
  // Force dynamic rendering for pages that use authentication hooks
  dynamic: 'force-dynamic' as const,
};