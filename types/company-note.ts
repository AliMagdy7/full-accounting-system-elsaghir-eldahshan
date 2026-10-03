export interface CompanyNoteImage {
  id: string;
  name: string;
  dataUrl: string;
}

export interface CompanyNote {
  id: string;
  companyId: string;
  text: string;
  images: CompanyNoteImage[];
  createdAt: string;
  updatedAt: string;
}
