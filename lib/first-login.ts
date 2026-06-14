import { invalidateActorCaches } from "@/lib/invalidate-actor-caches";
import { profileIdentityOrFilter } from "@/lib/profile-identity";

export class FirstLoginError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FirstLoginError";
    this.status = status;
  }
}

type PasswordVerifier = {
  auth: {
    signInWithPassword: (args: { email: string; password: string }) => Promise<{ error?: { message?: string } | null }>;
  };
};

type PasswordAdminClient = {
  auth: {
    admin: {
      updateUserById: (
        userId: string,
        attrs: { user_metadata?: Record<string, unknown> }
      ) => Promise<{ error?: { message?: string } | null }>;
    };
  };
  from: (table: string) => {
    update: (payload: Record<string, unknown>) => {
      or: (filter: string) => PromiseLike<{ error?: { message?: string } | null }>;
    };
  };
};

export async function clearFirstLoginState(input: {
  adminClient: PasswordAdminClient;
  userId: string;
  userMetadata?: Record<string, unknown> | null;
}) {
  const userId = String(input.userId || "").trim();
  const baseUserMetadata = { ...(input.userMetadata || {}) };

  if (!userId) {
    throw new FirstLoginError("User id is required.", 400);
  }

  const passwordUpdate = await input.adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...baseUserMetadata,
      must_change_password: false,
    },
  });

  if (passwordUpdate.error) {
    throw new FirstLoginError(
      passwordUpdate.error.message || "Failed to update password.",
      500
    );
  }

  const profileUpdate = await input.adminClient
    .from("profiles")
    .update({
      must_change_password: false,
      temporary_password_issued_at: null,
    })
    .or(profileIdentityOrFilter(userId));

  if (profileUpdate.error && !isMissingFirstLoginColumnError(profileUpdate.error)) {
    const rollback = await input.adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...baseUserMetadata,
        must_change_password: true,
      },
    });

    if (rollback.error) {
      throw new FirstLoginError(
        rollback.error.message || "Failed to roll back password change.",
        500
      );
    }

    throw new FirstLoginError("Failed to clear first-login flags.", 500);
  }

  await invalidateActorCaches(userId);

  return { success: true };
}

function isMissingFirstLoginColumnError(error?: { message?: string | null } | null) {
  const message = String(error?.message || "");
  return (
    message.includes("must_change_password") ||
    message.includes("temporary_password_issued_at")
  );
}
