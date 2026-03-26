import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjects } from "../api/projectsApi";
import useAppStore from "../store/useAppStore";
import type { Project } from "../types";

function pickDefaultProject(projects: Project[]) {
  const active = projects.find((p) => p.status === "active");
  return active ?? projects[0] ?? null;
}

export function useProjectBootstrap() {
  const user = useAppStore((s) => s.user);
  const selectedProject = useAppStore((s) => s.selectedProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const setProjects = useAppStore((s) => s.setProjects);
  const setProjectsLoading = useAppStore((s) => s.setProjectsLoading);
  const setProjectsError = useAppStore((s) => s.setProjectsError);
  const lastProjectsSignatureRef = useRef<string>("");

  const queryKey = useMemo(() => ["projects", user?.id], [user?.id]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getProjects(user.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setProjectsLoading(query.isLoading);
  }, [query.isLoading, setProjectsLoading]);

  useEffect(() => {
    setProjectsError(query.error ? (query.error as Error).message : null);
  }, [query.error, setProjectsError]);

  useEffect(() => {
    if (!query.data) return;
    const nextProjects = query.data;
    const signature = nextProjects
      .map((project) => `${project.id}:${project.created_at ?? ""}:${project.status}:${project.name}`)
      .join("|");

    if (lastProjectsSignatureRef.current !== signature) {
      lastProjectsSignatureRef.current = signature;
      setProjects(nextProjects);
    }

    const stillValid = selectedProject
      ? nextProjects.some((p) => p.id === selectedProject.id)
      : false;

    const nextSelected = stillValid ? selectedProject : pickDefaultProject(nextProjects);
    if (nextSelected?.id !== selectedProject?.id) {
      setSelectedProject(nextSelected);
    }
  }, [query.data, selectedProject, setProjects, setSelectedProject]);

  return query;
}
