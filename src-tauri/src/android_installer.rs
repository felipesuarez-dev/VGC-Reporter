//! Thin bridge to the app-local Kotlin plugin that launches the Android APK
//! installer with a FileProvider content:// URI. Desktop builds only register
//! an empty plugin so the shared builder compiles everywhere.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;
#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
pub struct AndroidInstaller<R: Runtime>(PluginHandle<R>);

#[cfg(target_os = "android")]
impl<R: Runtime> AndroidInstaller<R> {
    pub fn install(&self, path: &str) -> Result<(), String> {
        self.0
            .run_mobile_plugin::<()>("install", serde_json::json!({ "path": path }))
            .map_err(|error| error.to_string())
    }
}

#[cfg(target_os = "android")]
pub trait AndroidInstallerExt<R: Runtime> {
    fn android_installer(&self) -> &AndroidInstaller<R>;
}

#[cfg(target_os = "android")]
impl<R: Runtime, T: Manager<R>> AndroidInstallerExt<R> for T {
    fn android_installer(&self) -> &AndroidInstaller<R> {
        self.state::<AndroidInstaller<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("android-installer")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle = api.register_android_plugin(
                    "com.pumasoft.vgcreporter",
                    "AndroidInstallerPlugin",
                )?;
                app.manage(AndroidInstaller(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}
