export interface ContractorNoteImage {
  id: string;
  name: string;
  dataUrl: string;
}

export interface ContractorNote {
  id: string;
  contractorId: string;
  text: string;
  images: ContractorNoteImage[];
  createdAt: string;
  updatedAt: string;
}
