import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pharmacy } from "../backend.d";
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
    refetchInterval: 10000, // Rafraîchissement automatique toutes les 10 secondes
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
  return useMutation({
    mutationFn: async ({
      nom,
      tel,
      adresse,
    }: {
      nom: string;
      tel: string;
      adresse: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.submitPharmacy(nom, tel, adresse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
    },
  });
}

export function useGetPharmacyByName() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (nom: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPharmacyByName(nom);
    },
  });
}

export function useSetPharmacyOpenStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isOpen }: { id: bigint; isOpen: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setPharmacyOpenStatus(id, isOpen);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useApprovePharmacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approvePharmacy(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
      queryClient.invalidateQueries({ queryKey: ["approvedPharmacies"] });
    },
  });
}

export function useRejectPharmacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectPharmacy(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPharmacies"] });
    },
  });
}

export function useRevokePharmacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.revokePharmacy(id);
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
  return useMutation({
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
  return useMutation({
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
