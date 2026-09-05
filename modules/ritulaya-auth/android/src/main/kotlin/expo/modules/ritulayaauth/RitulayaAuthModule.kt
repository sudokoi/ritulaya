package expo.modules.ritulayaauth

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Callbacks and activity events run on main; the synchronous grant check is synchronized. */
class RitulayaAuthModule : Module() {
    private val session = AuthenticationSession()
    private var active: Request? = null
    private var prompt: BiometricPrompt? = null
    private var credentialPending = false

    private data class Request(
        val id: Long,
        val promise: Promise,
    )

    override fun definition() =
        ModuleDefinition {
            Name("RitulayaAuth")

            AsyncFunction("authenticate") { title: String, credentialLabel: String, promise: Promise ->
                val activity = appContext.currentActivity as? FragmentActivity
                if (activity == null || !activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
                    promise.resolve(failure("cancelled"))
                    return@AsyncFunction
                }
                session.enterForeground()
                val id = session.begin()
                if (id == null) {
                    promise.resolve(failure("cancelled"))
                    return@AsyncFunction
                }
                val request = Request(id, promise)
                active = request
                val keyguard = activity.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                if (!keyguard.isDeviceSecure) {
                    fail(request, "unavailable")
                } else if (BiometricManager.from(activity).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) !=
                    BiometricManager.BIOMETRIC_SUCCESS
                ) {
                    credentials(activity, request, title)
                } else {
                    val callback =
                        object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                                succeed(request)
                            }

                            override fun onAuthenticationError(
                                code: Int,
                                message: CharSequence,
                            ) {
                                if (active !== request || credentialPending) return
                                when (code) {
                                    BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                                    BiometricPrompt.ERROR_HW_UNAVAILABLE,
                                    BiometricPrompt.ERROR_NO_BIOMETRICS,
                                    BiometricPrompt.ERROR_LOCKOUT,
                                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
                                    -> credentials(activity, request, title)

                                    BiometricPrompt.ERROR_USER_CANCELED, BiometricPrompt.ERROR_CANCELED -> fail(request, "cancelled")

                                    else -> fail(request, "failed")
                                }
                            }
                        }
                    try {
                        prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), callback)
                        prompt?.authenticate(
                            BiometricPrompt.PromptInfo
                                .Builder()
                                .setTitle(title)
                                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                                .setNegativeButtonText(credentialLabel)
                                .build(),
                        )
                    } catch (_: Exception) {
                        fail(request, "unavailable")
                    }
                }
            }.runOnQueue(Queues.MAIN)

            Function("isAuthenticationCurrent") { token: String -> session.isCurrent(token) }
            AsyncFunction("cancel") { cancel() }.runOnQueue(Queues.MAIN)
            OnActivityEntersForeground { session.enterForeground() }
            OnActivityEntersBackground {
                session.enterBackground()
                if (!credentialPending) cancel()
            }
            // Unlike our NO_USER_ACTION credential launch, Home/app switching
            // invalidates an unfinished biometric request as well as old grants.
            OnUserLeavesActivity { cancel() }
            OnActivityDestroys { cancel() }
            OnDestroy { cancel() }
            OnActivityResult { _, result ->
                if (result.requestCode == CREDENTIAL_REQUEST && credentialPending) {
                    active?.let { request ->
                        if (result.resultCode == Activity.RESULT_OK) succeed(request) else fail(request, "cancelled")
                    }
                }
            }
        }

    @Suppress("DEPRECATION")
    private fun credentials(
        activity: FragmentActivity,
        request: Request,
        title: String,
    ) {
        if (active !== request || credentialPending) return
        val keyguard = activity.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val intent = keyguard.createConfirmDeviceCredentialIntent(title, null)
        if (intent == null) {
            fail(request, "unavailable")
            return
        }
        if (!session.awaitCredential(request.id)) {
            fail(request, "cancelled")
            return
        }
        credentialPending = true
        try {
            // Our own system-authentication handoff must not look like the user
            // leaving the app. The ordinary background event still revokes grants.
            intent.addFlags(Intent.FLAG_ACTIVITY_NO_USER_ACTION)
            activity.startActivityForResult(intent, CREDENTIAL_REQUEST)
        } catch (_: Exception) {
            fail(request, "unavailable")
        }
    }

    private fun succeed(request: Request) {
        if (active !== request) return
        val token = session.complete(request.id)
        active = null
        prompt = null
        credentialPending = false
        request.promise.resolve(if (token == null) failure("cancelled") else mapOf("success" to true, "token" to token))
    }

    private fun fail(
        request: Request,
        error: String,
    ) {
        if (active !== request) return
        active = null
        prompt = null
        credentialPending = false
        session.cancel()
        request.promise.resolve(failure(error))
    }

    private fun cancel() {
        val request = active
        val currentPrompt = prompt
        if (request != null) fail(request, "cancelled") else session.cancel()
        currentPrompt?.cancelAuthentication()
    }

    private fun failure(error: String) = mapOf("success" to false, "error" to error)

    private companion object {
        const val CREDENTIAL_REQUEST = 47291
    }
}
