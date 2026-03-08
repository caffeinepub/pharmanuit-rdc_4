import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pharmacy, SubmitResult } from "../backend.d";
import { useActor } from "./useActor";

export function useApprovedPharmacies() {
  const { actor, isFetching } = useActor();
  return useQuery<Pharmacy[]>({
    queryKey: ["approvedPharmacies"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getApprovedPharmacies();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllPharmacies() {
  const { actor, isFetching } = useActor();
  return useQuery<Pharmacy[]>({
    queryKey: ["allPharmacies"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPharmacies();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitPharmacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<
    SubmitResult,
    Error,
    { nom: string; tel: string; adresse: string }
  >({
    mutationFn: async ({ nom, tel, adresse }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.submitPharmacy(nom, tel, adresse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useGetPharmacyByCode() {
  const { actor } = useActor();
  return useMutation<Pharmacy | null, Error, string>({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPharmacyByCode(code);
    },
  });
}

export function useDeletePharmacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePharmacy(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useSetPharmacyOpenStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: bigint; isOpen: boolean }>({
    mutationFn: async ({ id, isOpen }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setPharmacyOpenStatus(id, isOpen);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useTogglePharmacyVisibility() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.togglePharmacyVisibility(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useInitializeSeedData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.initializeSeedData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}
