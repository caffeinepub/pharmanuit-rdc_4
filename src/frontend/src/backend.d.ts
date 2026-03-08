import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SubmitResult {
    id: bigint;
    code: string;
}
export interface RegisterResult {
    id: bigint;
    code: string;
}
export interface Pharmacy {
    id: bigint;
    lat: number;
    lng: number;
    nom: string;
    tel: string;
    statut: string;
    ouvert: boolean;
    codeSecret: string;
    email: string;
    approuve: boolean;
    visible: boolean;
    adresse: string;
}
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deletePharmacy(id: bigint): Promise<boolean>;
    getAllPharmacies(): Promise<Array<Pharmacy>>;
    getApprovedPharmacies(): Promise<Array<Pharmacy>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPharmacyByCode(code: string): Promise<Pharmacy | null>;
    getPharmacyByEmail(email: string): Promise<Pharmacy | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSeedData(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    loginPharmacist(email: string, code: string): Promise<Pharmacy | null>;
    registerPharmacist(email: string, nom: string, tel: string, adresse: string, ouvert: boolean): Promise<RegisterResult>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setPharmacyOpenStatus(id: bigint, isOpen: boolean): Promise<boolean>;
    submitPharmacy(nom: string, tel: string, adresse: string): Promise<SubmitResult>;
    togglePharmacyVisibility(id: bigint): Promise<boolean>;
}
