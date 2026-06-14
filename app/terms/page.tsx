import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms of Service | ZamSchool OS",
  description:
    "The terms that govern access to ZamSchool OS, a school operating system provided by ZenityCore.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      summary="These Terms of Service explain the rules for using ZamSchool OS, the school operating system provided by ZenityCore. They describe what schools and users can expect from the platform, what responsibilities come with access, and how we protect the integrity of school information."
      lastUpdated="May 10, 2026"
      sections={[
        {
          title: "About ZamSchool OS",
          body: (
            <>
              <p>
                ZamSchool OS is a software platform provided by ZenityCore to help schools manage
                administration, student records, staff workflows, teaching activities, attendance,
                academic results, communications, payments where enabled, and related school
                operations.
              </p>
              <p>
                In these terms, &quot;ZenityCore,&quot; &quot;we,&quot; &quot;us,&quot;
                and &quot;our&quot; refer to the company providing ZamSchool OS. &quot;You&quot;
                refers to the school, organization, administrator, teacher, staff member, parent,
                guardian, student, or other authorized user accessing the platform.
              </p>
            </>
          ),
        },
        {
          title: "Agreement to these terms",
          body: (
            <>
              <p>
                By creating an account, signing in, accepting an invitation, or otherwise using
                ZamSchool OS, you agree to follow these terms. If you do not agree, you should not
                access or use the platform.
              </p>
              <p>
                If you use ZamSchool OS on behalf of a school or organization, you confirm that you
                are authorized to accept these terms and manage the platform for that school or
                organization.
              </p>
            </>
          ),
        },
        {
          title: "School subscriptions and access",
          body: (
            <>
              <p>
                Access to ZamSchool OS may be provided through a school subscription, pilot,
                implementation arrangement, or other agreement with ZenityCore. Some features may be
                available only to certain schools, plans, roles, regions, or deployment stages.
              </p>
              <p>
                ZenityCore may activate, limit, suspend, or remove features where needed for
                security, product development, maintenance, legal compliance, non-payment, misuse,
                or changes to the service.
              </p>
            </>
          ),
        },
        {
          title: "Authorized use",
          body: (
            <>
              <p>
                ZamSchool OS must be used only for legitimate school purposes and only within the
                permissions assigned to each account. Administrators, teachers, parents, students,
                and staff must access only the records and features they are authorized to use.
              </p>
              <p>
                Users must not attempt to access another person&apos;s account, bypass permissions,
                copy or misuse confidential school information, disrupt the service, upload harmful
                content, or use the platform in a way that could damage ZamSchool OS, a school, or
                another user.
              </p>
              <p>
                Users must not use ZamSchool OS for unlawful activity, harassment, fraud,
                unauthorized marketing, scraping, reverse engineering, security testing without
                permission, or any activity that interferes with the platform&apos;s normal operation.
              </p>
            </>
          ),
        },
        {
          title: "Accounts, roles, and security",
          body: (
            <>
              <p>
                Schools are responsible for inviting the right users, assigning appropriate roles,
                maintaining accurate records, removing access when users leave or change roles, and
                making sure their community understands how the platform should be used.
              </p>
              <p>
                Each user is responsible for keeping login credentials private, using a secure
                device where possible, signing out of shared devices, and notifying the school or
                ZamSchool OS promptly if unauthorized access is suspected.
              </p>
              <p>
                ZenityCore may require verification steps, password resets, access reviews, or
                account restrictions if we believe an account is compromised or creating risk for a
                school, user, or the platform.
              </p>
            </>
          ),
        },
        {
          title: "School data and content",
          body: (
            <>
              <p>
                The school remains responsible for the records, messages, files, results, attendance
                information, payment details, and other content entered into ZamSchool OS by its
                authorized users. ZamSchool OS provides the system used to store, process, and
                display that information.
              </p>
              <p>
                Schools and users must make sure the information they enter is lawful, accurate, and
                appropriate for the school context. Sensitive information should only be added when
                it is necessary for a valid school purpose.
              </p>
              <p>
                ZenityCore does not claim ownership of school data. By entering or uploading content
                into ZamSchool OS, the school and authorized users give ZenityCore permission to
                host, process, display, transmit, back up, and use that content only as needed to
                provide, secure, support, and improve the platform.
              </p>
            </>
          ),
        },
        {
          title: "Student, parent, and staff records",
          body: (
            <>
              <p>
                ZamSchool OS may contain personal and educational information about students,
                parents, guardians, teachers, staff, and school administrators. Users must treat
                this information with care and access it only for legitimate school purposes.
              </p>
              <p>
                Schools are responsible for complying with laws, regulations, policies, consent
                requirements, and professional duties that apply to their handling of student,
                family, and staff information.
              </p>
            </>
          ),
        },
        {
          title: "Payments and fees",
          body: (
            <>
              <p>
                Where payment or fee features are enabled, ZamSchool OS may help schools organize
                billing records, balances, receipts, or payment workflows. The school remains
                responsible for setting fees, confirming payments, issuing refunds where applicable,
                and resolving billing questions with parents or guardians.
              </p>
              <p>
                Third-party payment providers may apply their own terms, fees, processing times,
                and verification requirements.
              </p>
              <p>
                Unless a separate written agreement says otherwise, ZamSchool OS is not a bank,
                financial institution, or tax adviser. Schools remain responsible for their financial
                records, reporting, tax treatment, and payment decisions.
              </p>
            </>
          ),
        },
        {
          title: "Support and communications",
          body: (
            <>
              <p>
                ZenityCore may contact schools and authorized users about service updates, security
                notices, support requests, onboarding, billing, product changes, or important
                operational information related to ZamSchool OS.
              </p>
              <p>
                Schools are responsible for making sure their contact information is accurate and
                that important notices from ZenityCore reach the people responsible for managing the
                platform.
              </p>
            </>
          ),
        },
        {
          title: "Service management",
          body: (
            <>
              <p>
                We may update features, improve performance, fix defects, introduce new tools,
                modify workflows, or remove features that are no longer practical or secure. We aim
                to make changes responsibly and with attention to school operations.
              </p>
              <p>
                We may suspend or restrict access if an account creates a security risk, violates
                these terms, misuses school data, threatens the stability of the platform, or is
                required to be restricted by law or school instruction.
              </p>
            </>
          ),
        },
        {
          title: "Availability, backups, and changes",
          body: (
            <>
              <p>
                We work to keep ZamSchool OS reliable and available, but no digital service can be
                uninterrupted at all times. Maintenance, network issues, third-party service
                interruptions, security events, or other circumstances may affect access.
              </p>
              <p>
                We may maintain backups and recovery processes, but schools should keep copies of
                critical records where required by their own policies or legal obligations.
              </p>
              <p>
                We may revise these terms as the service, laws, or business needs change. The latest
                version will be posted on this page with the updated date. Continued use of
                ZamSchool OS after the stated update date means the revised terms apply.
              </p>
            </>
          ),
        },
        {
          title: "Intellectual property",
          body: (
            <>
              <p>
                ZamSchool OS, including its software, interface, workflows, design, branding,
                documentation, and underlying technology, is owned by ZenityCore or its licensors
                and is protected by applicable intellectual property laws.
              </p>
              <p>
                These terms give authorized users permission to use ZamSchool OS for approved school
                purposes. They do not transfer ownership of the platform, source code, trademarks,
                designs, or other ZenityCore intellectual property.
              </p>
            </>
          ),
        },
        {
          title: "Third-party services",
          body: (
            <>
              <p>
                ZamSchool OS may rely on third-party services for hosting, authentication,
                databases, file storage, analytics, email, communications, maps, payments, or other
                supporting functions. Those services may have their own terms and privacy policies.
              </p>
              <p>
                ZenityCore is not responsible for third-party services that are outside our control,
                but we aim to choose providers that support reliable and secure operation of
                ZamSchool OS.
              </p>
            </>
          ),
        },
        {
          title: "Professional use and responsibility",
          body: (
            <>
              <p>
                ZamSchool OS is built for trusted school environments. Users should communicate
                respectfully, handle student and family information carefully, and follow applicable
                school rules, employment obligations, child protection expectations, and local laws.
              </p>
              <p>
                Nothing in these terms replaces the professional judgment of school leaders,
                teachers, or authorized staff. The platform supports decisions and recordkeeping,
                but schools remain responsible for their educational, administrative, and legal
                obligations.
              </p>
            </>
          ),
        },
        {
          title: "Limitation of liability",
          body: (
            <>
              <p>
                ZamSchool OS is provided to support school operations, but schools remain
                responsible for decisions, records, policies, communications, and actions taken by
                their staff and authorized users. To the extent permitted by law, ZenityCore is not
                responsible for indirect losses, loss of profits, loss of data caused by user action,
                school policy failures, or misuse of the platform.
              </p>
              <p>
                Nothing in these terms limits liability where the law does not allow such limitation.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Questions about these terms or ZamSchool OS can be sent to ZenityCore at{" "}
                <a className="font-medium text-slate-900 hover:underline" href="mailto:zenitycoreinc@gmail.com">
                  zenitycoreinc@gmail.com
                </a>
                . Please include the school name, your role, and the issue you would like us to
                review.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
