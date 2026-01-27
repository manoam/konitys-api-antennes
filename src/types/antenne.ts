// Types basés sur la structure contact_antennes du CRM
// Table PostgreSQL: antennes

export interface Antenne {
  id: number;
  nom: string | null;
  prenom: string;
  civilite: string;
  date_naissance: Date | null;
  tel_portable: string | null;
  tel_fixe: string | null;
  email: string | null;
  situation_professionnelle: string | null;
  adresse: string | null;
  adresse_complementaire: string | null;
  cp: string | null;
  ville: string | null;
  pays: string | null;
  pays_id: number | null;
  type_statut_id: number | null;
  raison_sociale: string | null;
  siret: string | null;
  etat: 'actif' | 'inactif';
  type_profil_id: number | null;
  antenne_principale: boolean;
  bon_savoir: string | null;
  information_facturation: string | null;
  iban: string | null;
  bic: string | null;
  precisions_lieu: string | null;
  preferences_horaires_pickup_retrait: string | null;
  preferences_horaires_pickup_retour: string | null;
  not_share_phone_number: boolean;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAntenneDTO {
  nom?: string;
  prenom: string;
  civilite: string;
  date_naissance?: string;
  tel_portable?: string;
  tel_fixe?: string;
  email?: string;
  situation_professionnelle?: string;
  adresse?: string;
  adresse_complementaire?: string;
  cp?: string;
  ville?: string;
  pays?: string;
  pays_id?: number;
  type_statut_id?: number;
  raison_sociale?: string;
  siret?: string;
  etat?: 'actif' | 'inactif';
  type_profil_id?: number;
  antenne_principale?: boolean;
  bon_savoir?: string;
  information_facturation?: string;
  iban?: string;
  bic?: string;
  precisions_lieu?: string;
  preferences_horaires_pickup_retrait?: string;
  preferences_horaires_pickup_retour?: string;
  not_share_phone_number?: boolean;
}

export interface UpdateAntenneDTO extends Partial<CreateAntenneDTO> {}

export interface AntenneFilters {
  key?: string;
  etat?: 'actif' | 'inactif';
  ville?: string;
  type_profil_id?: number;
  antenne_principale?: boolean;
  has_iban?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
