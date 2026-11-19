// Form values for a pre-filled agent profile, shared by the admin page (server) and PrefillForm (browser).

export interface PrefillFormValues {
  email: string;
  name: string;
  brokerage: string;
  phone: string;
  teamName: string;
  officePhone: string;
  officeAddress: string;
  licenseNumber: string;
  mlsId: string;
  licensedSince: string;
  counties: string[];
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  bio: string;
  licenseVerified: boolean;
  notes: string;
}

export const EMPTY_PREFILL: PrefillFormValues = {
  email: "",
  name: "",
  brokerage: "",
  phone: "",
  teamName: "",
  officePhone: "",
  officeAddress: "",
  licenseNumber: "",
  mlsId: "",
  licensedSince: "",
  counties: [],
  website: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  bio: "",
  licenseVerified: false,
  notes: "",
};
