import { AccountMessagesPage } from "@/components/account/AccountMessagesPage";

export default function ParentMessagesPage() {
  return (
    <AccountMessagesPage
      title="Messages"
      intro="Send and receive school-related messages about your children and school updates."
      hintRole="parent"
    />
  );
}
