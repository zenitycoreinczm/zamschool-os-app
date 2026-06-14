import Link from "next/link";
import Image from "next/image";

export default function JoinSchoolPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden w-1/2 flex-col items-center justify-center border-r border-slate-200 bg-white p-12 text-center lg:flex">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-8 shadow-lg">
          <Image
            src="/icon.png"
            alt="ZamSchool OS"
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Join Your School
        </h1>
        <p className="text-gray-600 text-lg max-w-md">
          Enter your school code and student details to activate your account.
        </p>
        <div className="mt-12 relative w-full max-w-sm aspect-square">
          <Image
            src="https://picsum.photos/seed/join/800/800"
            alt="School Illustration"
            fill
            className="object-cover rounded-2xl shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="lg:hidden w-12 h-12 rounded-full overflow-hidden mb-6 shadow-sm mx-auto">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Student Join
          </h2>
          <p className="text-sm text-gray-600 text-center mb-8">
            Accounts are created by your Head Teacher. Ask the school office for
            your email and temporary password, then sign in below.
          </p>
          <form className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                School Code
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-200 p-3 outline-none transition-all focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                placeholder="Enter school code"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Student Number
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-200 p-3 outline-none transition-all focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                placeholder="Enter student number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-200 p-3 outline-none transition-all focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                placeholder="Enter first name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-200 p-3 outline-none transition-all focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                placeholder="Enter last name"
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded-lg cursor-not-allowed shadow-sm mt-2"
            >
              Record matching coming soon
            </button>
            <Link
              href="/register"
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-slate-950 py-3 font-bold text-white transition-all hover:bg-slate-800"
            >
              Request access
            </Link>
          </form>
          <div className="mt-8 text-center text-sm text-gray-600 flex flex-col gap-2">
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-600 hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
