import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem("activeProjectId");
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Project[];
    },
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Não autenticado");
    const { data, error } = await (supabase as any)
      .from("projects")
      .insert({ name, user_id: userData.user.id })
      .select()
      .single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["projects"] });
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
