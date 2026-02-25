import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  isLoading: boolean;
  createProject: (name: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  activeProject: null,
  setActiveProjectId: () => {},
  isLoading: true,
  createProject: async () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { activeAccountId } = useAccount();
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem("activeProjectId");
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", activeAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("account_id", activeAccountId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Project[];
    },
    enabled: !!activeAccountId,
  });

  useEffect(() => {
    if (projects.length > 0 && !projects.find((p) => p.id === activeId)) {
      const id = projects[0].id;
      setActiveId(id);
      localStorage.setItem("activeProjectId", id);
    }
  }, [projects, activeId]);

  const activeProject = projects.find((p) => p.id === activeId) || projects[0] || null;

  const createProject = async (name: string) => {
    if (!activeAccountId) throw new Error("Sem conta ativa");
    const { data, error } = await (supabase as any)
      .from("projects")
      .insert({ name, account_id: activeAccountId })
      .select()
      .single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["projects", activeAccountId] });
    qc.invalidateQueries({ queryKey: ["active-projects"] });
    if (data) {
      setActiveId(data.id);
      localStorage.setItem("activeProjectId", data.id);
    }
  };

  const handleSetActiveId = (id: string) => {
    setActiveId(id);
    localStorage.setItem("activeProjectId", id);
    qc.invalidateQueries();
  };

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProjectId: handleSetActiveId, isLoading, createProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
