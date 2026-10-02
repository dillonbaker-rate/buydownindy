import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_OF_USE } from "@/content/legal";

export const metadata = { title: "Terms of use · BuyDown Indy" };

export default function TermsPage() {
  return <LegalPage title="Terms of use" sections={TERMS_OF_USE} />;
}
