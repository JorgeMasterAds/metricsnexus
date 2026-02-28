import { createContext, useContext, useState, ReactNode } from "react";

export type PreviewRole = "real" | "member" | "viewer";

interface RolePreviewContextType {
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  isPreviewActive: boolean;
}

const RolePreviewContext = createContext<RolePreviewContextType>({
  previewRole: "real",
  setPreviewRole: () => {},
  isPreviewActive: false,
});

export function RolePreviewProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRole] = useState<PreviewRole>("real");

  return (
    <RolePreviewContext.Provider value={{
      previewRole,
      setPreviewRole,
      isPreviewActive: previewRole !== "real",
    }}>
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  return useContext(RolePreviewContext);
}
