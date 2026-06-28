import { AccountMessagesPage } from "@/components/account/AccountMessagesPage";

export default function StudentMessagesPage() {
  return (
    <AccountMessagesPage
      title="Messages"
      intro="Send and receive school-related messages from your teachers and school team."
      hintRole="student"
    />
  );
}
