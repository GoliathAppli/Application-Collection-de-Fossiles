export type Period = 'Precambrien' | 'Paléozoïque' | 'Mésozoïque' | 'Cénozoïque';

export interface Fossil {
  id: string;
  period: Period; // Main Era
  detailedPeriodStart?: string;
  detailedPeriodEnd?: string;
  carouselImage: string; // Image for the carousel button
  
  // Fiche type
  title: string;
  mainImage: string;
  reference: string;
  
  description: string;
  descriptionImages: string[]; // up to 6
  
  discoveryLocation: string;
  discoveryLat?: number;
  discoveryLng?: number;
  
  animalOrigin: string;
  animalImage: string;
  alimentation: string;
  
  speciesType?: 'animal' | 'vegetal';
  speciesImages?: string[];
  speciesSize?: string;
  
  fossilDating: string; // For the timescale
  
  didYouKnowText: string;
  didYouKnowImage: string;
  
  // Technical sheet info automatically synced
  techSheetType?: 'achat' | 'prelevement';
  techSheetDatePrelevement?: string;
  techSheetLieuPrelevement?: string;
  techSheetProvenance?: string;
  techSheetDateAchat?: string;
  techSheetLieuAchat?: string;
  techSheetCertificat?: 'oui' | 'non' | '';
  techSheetCertificatPhoto?: string;
  techSheetPrix?: number;
}

export interface TechnicalSheet {
  id: string;
  fossilId?: string;
  nom: string;
  nomPhoto: string;
  provenance: string;
  periode: string; // This can be used or overridden
  fossilDating?: string; // Exact dating
  typeSheet?: 'achat' | 'prelevement';
  dateAchat?: string;
  lieuAchat?: string;
  certificat?: 'oui' | 'non' | '';
  certificatPhoto?: string;
  prix?: number;
  datePrelevement?: string;
  lieuPrelevement?: string;
}
