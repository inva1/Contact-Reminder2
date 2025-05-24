import { useQuery, useMutation } from "@tanstack/react-query";
import { ContactWithSuggestion } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function useContacts() {
  return useQuery({
    queryKey: ["/api/contacts"],
  });
}

export function useContact(id: string | number) {
  return useQuery({
    queryKey: [`/api/contacts/${id}`],
  });
}

export function useContactMessages(id: string | number) {
  return useQuery({
    queryKey: [`/api/contacts/${id}/messages`],
  });
}

export function useContactSuggestion(id: string | number) {
  return useQuery({
    queryKey: [`/api/contacts/${id}/suggestion`],
  });
}

export function useAddContact() {
  return useMutation({
    mutationFn: async (data: Partial<ContactWithSuggestion>) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });
}

export function useUpdateContact() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number;
      data: Partial<ContactWithSuggestion>;
    }) => {
      const res = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}`],
      });
    },
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiRequest("DELETE", `/api/contacts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });
}

export function useImportChat() {
  return useMutation({
    mutationFn: async ({
      id,
      chatText,
    }: {
      id: string | number;
      chatText: string;
    }) => {
      const res = await apiRequest("POST", `/api/contacts/${id}/import`, {
        chatText,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}/messages`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}/suggestion`],
      });
    },
  });
}

export function useGenerateSuggestion() {
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiRequest(
        "POST",
        `/api/contacts/${id}/suggestion`,
        {}
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}/suggestion`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/contacts"],
      });
    },
  });
}

export function useContactAnalysis(id: string | number) {
  return useQuery({
    queryKey: [`/api/contacts/${id}/analysis`],
    enabled: !!id
  });
}

export function useSuggestionAlternatives(id: string | number) {
  return useQuery({
    queryKey: [`/api/contacts/${id}/suggestion-alternatives`],
    enabled: !!id
  });
}

export function useUpdateSuggestion() {
  return useMutation({
    mutationFn: async ({
      id,
      suggestion,
    }: {
      id: string | number;
      suggestion: string;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/contacts/${id}/suggestion`,
        { suggestion }
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}/suggestion`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${variables.id}`],
      });
    },
  });
}
