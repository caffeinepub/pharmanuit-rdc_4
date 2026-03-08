import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Pharmacy {
    id: bigint;
    lat: number;
    lng: number;
    nom: string;
    tel: string;
    statut: string;
    ouvert: boolean;
    approuve: boolean;
    visible: boolean;
    adresse: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approvePharmacy(id: bigint): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllPharmacies(): Promise<Array<Pharmacy>>;
    getApprovedPharmacies(): Promise<Array<Pharmacy>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPharmacyByName(nom: string): Promise<Pharmacy | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSeedData(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    rejectPharmacy(id: bigint): Promise<boolean>;
    revokePharmacy(id: bigint): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setPharmacyOpenStatus(id: bigint, isOpen: boolean): Promise<boolean>;
    submitPharmacy(nom: string, tel: string, adresse: string): Promise<bigint>;
    togglePharmacyVisibility(id: bigint): Promise<boolean>;
}
