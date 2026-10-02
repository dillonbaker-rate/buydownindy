import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY } from "@/content/legal";

export const metadata = { title: "Privacy policy · BuyDown Indy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" sections={PRIVACY} />;
}
