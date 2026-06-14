import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | ZamSchool OS",
  description:
    "How ZenityCore handles personal information and school data in ZamSchool OS.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      summary="This Privacy Policy explains how ZenityCore collects, uses, stores, shares, and protects information when schools, staff, parents, students, and authorized users use ZamSchool OS. ZamSchool OS is built to manage sensitive school operations, so privacy, security, and responsible data handling are central to how the platform works."
      lastUpdated="May 10, 2026"
      sections={[
        {
          title: "Who we are",
          body: (
            <>
              <p>
                ZamSchool OS is a school management software platform provided by ZenityCore. In
                this policy, &quot;ZenityCore,&quot; &quot;we,&quot; &quot;us,&quot; and
                &quot;our&quot; refer to the company that provides and supports ZamSchool OS.
                &quot;You&quot; refers to the school, staff member, parent, guardian, student,
                administrator, or other authorized user accessing the platform.
              </p>
              <p>
                ZamSchool OS helps schools manage administration, student records, teaching
                workflows, attendance, results, communication, payments where enabled, and related
                school operations.
              </p>
            </>
          ),
        },
        {
          title: "Our privacy commitment",
          body: (
            <>
              <p>
                Schools trust ZamSchool OS with information that matters: student profiles, family
                contact details, staff accounts, attendance, academic results, billing information,
                messages, announcements, documents, and operational records. We treat that
                information as confidential school data.
              </p>
              <p>
                We use information to provide and improve ZamSchool OS, protect accounts, support
                schools, maintain reliable service, and comply with applicable obligations. We do
                not sell school data or use student records for unrelated advertising.
              </p>
            </>
          ),
        },
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                Depending on the features a school uses, ZamSchool OS may process names, email
                addresses, phone numbers, account credentials, school roles, class assignments,
                subject assignments, staff profiles, student profiles, parent or guardian
                relationships, attendance records, academic results, assessment records, messages,
                announcements, fee records, payment status, uploaded files, and other information
                entered by authorized users.
              </p>
              <p>
                We also collect limited technical information such as device type, browser type,
                IP address, session activity, error logs, security events, and usage patterns. This
                helps us keep the service secure, diagnose issues, prevent misuse, and improve
                performance for schools.
              </p>
            </>
          ),
        },
        {
          title: "How information is used",
          body: (
            <>
              <p>
                We use information to create and manage accounts, verify users, assign roles,
                organize classes, record attendance, publish results, support teacher workflows,
                send school communications, manage parent and student access, support billing
                workflows where enabled, provide dashboards, and help schools operate more
                efficiently.
              </p>
              <p>
                We may also use information to provide support, audit important actions, detect
                suspicious behavior, maintain backups, improve product quality, and comply with
                applicable legal or regulatory requirements.
              </p>
            </>
          ),
        },
        {
          title: "Location and device information",
          body: (
            <>
              <p>
                ZamSchool OS may collect device and technical information automatically when users
                access the platform. If a future feature requires location access, we will use it
                only where it is needed for a clear platform function and where the device or
                browser allows the user to grant or deny permission.
              </p>
              <p>
                Users can control device permissions through their browser, phone, tablet, or
                computer settings. Disabling certain permissions may limit features that depend on
                them.
              </p>
            </>
          ),
        },
        {
          title: "School control and user access",
          body: (
            <>
              <p>
                ZamSchool OS uses role-based access so users only see the information their school
                has authorized them to access. For example, administrators manage school operations,
                teachers access assigned teaching information, parents or guardians view information
                connected to their children, and students access their own school information.
              </p>
              <p>
                Each school is responsible for choosing the users it invites, assigning the correct
                roles, keeping school records accurate, and removing access when it is no longer
                appropriate.
              </p>
            </>
          ),
        },
        {
          title: "When information may be shared",
          body: (
            <>
              <p>
                We share information only when needed to operate ZamSchool OS, provide support,
                process authorized school workflows, comply with the law, protect the platform, or
                work with trusted service providers such as hosting, database, authentication,
                storage, email, analytics, or payment infrastructure providers.
              </p>
              <p>
                Service providers are expected to handle information securely and only for the
                purpose of providing services to ZamSchool OS. We do not permit them to use school
                data for their own unrelated marketing.
              </p>
              <p>
                We may also disclose information if required by law, court order, lawful government
                request, school instruction, or where disclosure is necessary to protect the rights,
                safety, security, or property of ZenityCore, ZamSchool OS, schools, users, or the
                public.
              </p>
            </>
          ),
        },
        {
          title: "Business transfers",
          body: (
            <>
              <p>
                If ZenityCore is involved in a merger, acquisition, restructuring, financing, or
                sale of some or all of its business or assets, information related to ZamSchool OS
                may be transferred as part of that transaction.
              </p>
              <p>
                Where this happens, we will take reasonable steps to ensure the information remains
                protected and continues to be handled in line with this policy or a policy that
                provides appropriate protection.
              </p>
            </>
          ),
        },
        {
          title: "Security",
          body: (
            <>
              <p>
                We use administrative, technical, and operational safeguards intended to protect
                information against unauthorized access, loss, misuse, or alteration. These may
                include account authentication, session protection, access controls, audit logging,
                secure infrastructure, and regular review of platform behavior.
              </p>
              <p>
                No online service can guarantee absolute security. Schools and users should use
                strong credentials, keep login details private, and report suspected unauthorized
                access promptly.
              </p>
            </>
          ),
        },
        {
          title: "Retention of information",
          body: (
            <>
              <p>
                We keep information for as long as needed to provide ZamSchool OS, support legitimate
                school recordkeeping, maintain backups, resolve disputes, prevent fraud, comply with
                legal obligations, and enforce our agreements.
              </p>
              <p>
                When information is no longer required, we take reasonable steps to delete,
                anonymize, or securely retain it according to operational and legal needs. Schools
                may contact us for help with account closure, export, correction, or deletion
                requests.
              </p>
              <p>
                Some information may remain for a limited period in backups, logs, audit records, or
                archived systems where deletion is not immediate, especially when needed for
                security, disaster recovery, legal compliance, fraud prevention, or dispute
                resolution.
              </p>
            </>
          ),
        },
        {
          title: "International processing",
          body: (
            <>
              <p>
                ZamSchool OS may use technology providers whose systems operate in different
                countries. This means information may be processed or stored outside the country
                where a school or user is located.
              </p>
              <p>
                When information is transferred or processed internationally, we take reasonable
                steps to protect it through appropriate technical, contractual, and operational
                safeguards.
              </p>
            </>
          ),
        },
        {
          title: "Children and student information",
          body: (
            <>
              <p>
                ZamSchool OS is designed for schools and may contain information about students,
                including children. Student information should be entered and managed by schools,
                staff, parents, guardians, or authorized users for legitimate educational and school
                administration purposes.
              </p>
              <p>
                If a parent, guardian, or student believes information in ZamSchool OS is incorrect
                or should not be available, they should contact the school first because the school
                controls most student records. ZenityCore can assist schools with appropriate
                requests.
              </p>
            </>
          ),
        },
        {
          title: "Your choices and requests",
          body: (
            <>
              <p>
                Users may be able to update some account information directly in the platform.
                Requests involving student records, parent relationships, academic results, or
                school-managed information should usually be directed first to the school because
                the school controls those records.
              </p>
              <p>
                We will review privacy requests carefully and may need to verify the requester,
                confirm school authorization, or preserve information where required by law or
                legitimate recordkeeping obligations.
              </p>
            </>
          ),
        },
        {
          title: "Links and third-party services",
          body: (
            <>
              <p>
                ZamSchool OS may include links to third-party websites or may connect to third-party
                services used for infrastructure, authentication, analytics, communications, file
                storage, or payments where enabled. Those third parties may have their own privacy
                policies and terms.
              </p>
              <p>
                ZenityCore is not responsible for privacy practices on websites or services that we
                do not operate. Users should review third-party policies when leaving ZamSchool OS
                or using connected services.
              </p>
            </>
          ),
        },
        {
          title: "Changes to this policy",
          body: (
            <>
              <p>
                We may update this Privacy Policy from time to time as ZamSchool OS, our operations,
                or applicable requirements change. The updated version will be posted on this page
                with a new &quot;Last updated&quot; date.
              </p>
              <p>
                Continued use of ZamSchool OS after an update means the revised policy applies from
                the updated date shown on this page.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Privacy questions, security concerns, or data requests about ZamSchool OS can be
                sent to ZenityCore at{" "}
                <a className="font-medium text-slate-900 hover:underline" href="mailto:zenitycoreinc@gmail.com">
                  zenitycoreinc@gmail.com
                </a>
                . Please include the school name, your role, and enough detail for us to understand
                and respond to the request.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
