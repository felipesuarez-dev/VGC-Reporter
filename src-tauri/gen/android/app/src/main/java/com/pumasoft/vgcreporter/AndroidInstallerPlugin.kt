package com.pumasoft.vgcreporter

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File
import java.security.MessageDigest

@InvokeArg
class InstallApkArgs {
    lateinit var path: String
}

/**
 * Launches the system package installer with a content:// URI. Verifies that
 * the APK is signed by the same key as the installed app before handing it to
 * Android, and sends the user straight to the unknown-sources permission when
 * it is missing.
 */
@TauriPlugin
class AndroidInstallerPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun install(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(InstallApkArgs::class.java)
            val apk = File(args.path)
            if (!apk.isFile || apk.length() == 0L) {
                invoke.reject("apk_missing")
                return
            }
            if (!sameSigningCertificate(apk)) {
                invoke.reject("signature_mismatch")
                return
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                !activity.packageManager.canRequestPackageInstalls()
            ) {
                val settings = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${activity.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(settings)
                invoke.reject("install_permission_required")
                return
            }
            val uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apk
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (intent.resolveActivity(activity.packageManager) == null) {
                invoke.reject("installer_unavailable")
                return
            }
            activity.startActivity(intent)
            invoke.resolve()
        } catch (error: Exception) {
            invoke.reject(error.message ?: "install_failed")
        }
    }

    private fun sameSigningCertificate(apk: File): Boolean {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            @Suppress("DEPRECATION")
            PackageManager.GET_SIGNATURES
        }
        val archive = activity.packageManager.getPackageArchiveInfo(apk.absolutePath, flags)
            ?: return false
        val installed = activity.packageManager.getPackageInfo(activity.packageName, flags)
        val archiveSignatures = signatures(archive)
        val installedSignatures = signatures(installed)
        return archiveSignatures.isNotEmpty() && archiveSignatures == installedSignatures
    }

    private fun signatures(info: PackageInfo): Set<String> {
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.signingInfo?.apkContentsSigners
                ?: info.signingInfo?.signingCertificateHistory
        } else {
            @Suppress("DEPRECATION")
            info.signatures
        } ?: return emptySet()
        return signatures.map { signature ->
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(signature.toByteArray())
            digest.joinToString("") { byte ->
                (byte.toInt() and 0xFF).toString(16).padStart(2, '0')
            }
        }.toSet()
    }
}
