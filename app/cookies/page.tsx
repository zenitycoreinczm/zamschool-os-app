import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Cookie Policy | ZamSchool OS",
  description:
    "How ZenityCore uses cookies and browser storage in ZamSchool OS.",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      summary="This Cookie Policy explains how ZenityCore uses cookies, local storage, session storage, and similar technologies in ZamSchool OS. These tools help keep school accounts secure, support login sessions, remember useful settings, and improve platform reliability."
      lastUpdated="May 10, 2026"
      sections={[
        {
          title: "Who this policy applies to",
          body: (
            <>
              <p>
                This policy applies to schools, administrators, teachers, staff, parents, guardians,
                students, and other authorized users who access ZamSchool OS through a browser or
                supported device.
              </p>
              <p>
                In this policy, &quot;ZenityCore,&quot; &quot;we,&quot; &quot;us,&quot;
                and &quot;our&quot; refer to the company providing ZamSchool OS.
              </p>
            </>
          ),
        },
        {
          title: "What cookies are",
          body: (
            <>
              <p>
                Cookies are small files stored by a browser when a person visits a website. Similar
                technologies, such as local storage and session storage, can also remember limited
                information in the browser so the application works properly.
              </p>
              <p>
                ZamSchool OS uses these technologies carefully and primarily for secure access,
                platform functionality, reliability, and user experience.
              </p>
            </>
          ),
        },
        {
          title: "Essential cookies",
          body: (
            <>
              <p>
                Essential cookies and storage are required for core features such as signing in,
                keeping a session active, protecting accounts, routing users to the right area of
                the platform, remembering basic preferences, and supporting secure navigation.
              </p>
              <p>
                Without essential cookies, users may not be able to log in, remain signed in, or use
                important school management features reliably.
              </p>
              <p>
                Essential cookies may also help prevent unauthorized access, verify session status,
                support role-based navigation, and keep users connected to the correct school
                workspace.
              </p>
            </>
          ),
        },
        {
          title: "Account and preference storage",
          body: (
            <>
              <p>
                ZamSchool OS may use browser storage to remember practical preferences such as
                interface choices, workspace state, offline readiness, or other settings that make
                the platform easier to use across visits.
              </p>
              <p>
                Preference storage is intended to improve convenience and does not give users access
                to information outside their assigned school role.
              </p>
              <p>
                Examples may include remembering selected views, interface settings, dashboard state,
                recently used school tools, or offline-readiness information needed to make the
                application feel consistent between visits.
              </p>
            </>
          ),
        },
        {
          title: "Security and fraud prevention",
          body: (
            <>
              <p>
                Cookies and browser storage may be used to detect unusual session behavior, protect
                account access, reduce repeated verification steps, prevent unauthorized use, and
                support audit and security monitoring.
              </p>
              <p>
                These technologies help protect sensitive school information such as student
                records, staff accounts, parent access, results, attendance, messages, and payment
                workflows where enabled.
              </p>
            </>
          ),
        },
        {
          title: "Performance and diagnostics",
          body: (
            <>
              <p>
                We may use limited diagnostic tools to understand uptime, page performance, errors,
                security events, and feature reliability. This helps us find problems quickly and
                improve the service for schools, teachers, parents, and students.
              </p>
              <p>
                Diagnostic information is used to operate and improve ZamSchool OS. It is not used
                to sell school data or target unrelated advertising.
              </p>
              <p>
                Diagnostic data may include page load information, error reports, browser type,
                device type, general usage patterns, and technical events that help ZenityCore
                understand whether the platform is working as expected.
              </p>
            </>
          ),
        },
        {
          title: "Third-party services",
          body: (
            <>
              <p>
                Some cookies or browser storage may be connected to trusted service providers that
                support hosting, authentication, database services, security, analytics, email, file
                storage, or payment workflows where enabled.
              </p>
              <p>
                These providers may process limited technical information needed to deliver their
                services. Their use of cookies or storage may also be governed by their own policies.
              </p>
            </>
          ),
        },
        {
          title: "What we do not use cookies for",
          body: (
            <>
              <p>
                ZamSchool OS is a school operations platform, not an advertising network. We do not
                use cookies to sell school data, build unrelated advertising profiles from student
                records, or allow third parties to use confidential school information for their own
                unrelated marketing.
              </p>
              <p>
                If we introduce optional analytics, communication, or product improvement tools, we
                will use them to support ZamSchool OS and the schools using it.
              </p>
            </>
          ),
        },
        {
          title: "Managing cookies",
          body: (
            <>
              <p>
                Most browsers allow users to review, block, or delete cookies through browser
                settings. Users can also clear local storage or site data from their browser when
                needed.
              </p>
              <p>
                Blocking or deleting essential cookies may sign users out, remove preferences, or
                prevent important parts of ZamSchool OS from working correctly.
              </p>
              <p>
                If a school-managed device blocks cookies or clears site data automatically, users
                may need to sign in again more often or reconfigure certain preferences.
              </p>
            </>
          ),
        },
        {
          title: "School-managed devices",
          body: (
            <>
              <p>
                Schools may control browser settings, device policies, firewalls, extensions, or
                security tools on school-managed devices. Those settings can affect how cookies and
                browser storage work in ZamSchool OS.
              </p>
              <p>
                If ZamSchool OS does not load, does not keep users signed in, or repeatedly loses
                preferences on a school-managed device, the school&apos;s IT administrator may need to
                allow the platform&apos;s required cookies and storage.
              </p>
            </>
          ),
        },
        {
          title: "Updates to this policy",
          body: (
            <>
              <p>
                We may update this Cookie Policy when we change how ZamSchool OS uses cookies,
                browser storage, diagnostics, or supporting technology. The latest version will be
                shown on this page with the updated date.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Questions about cookies, browser storage, or ZamSchool OS can be sent to ZenityCore
                at{" "}
                <a className="font-medium text-slate-900 hover:underline" href="mailto:zenitycoreinc@gmail.com">
                  zenitycoreinc@gmail.com
                </a>
                . Please include the school name, browser you are using, and a short description of
                the question or issue.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
